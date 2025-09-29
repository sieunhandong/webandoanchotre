require("dotenv").config();
const axios = require("axios");
const Order = require("../models/Order");
const Book = require("../models/Book");
const { GHN_API_URL, GHN_TOKEN, GHN_SHOP_ID, GHN_SERVICE_TYPE_NHE } =
  process.env;
const getProvince = async (req, res) => {
  try {
    const response = await axios.get(`${GHN_API_URL}/master-data/province`, {
      headers: {
        Token: GHN_TOKEN,
      },
    });
    const dataResponse = response.data;
    const provinces = dataResponse?.data.map((province) => ({
      ProvinceID: province.ProvinceID,
      ProvinceName: province.ProvinceName,
      Code: province.Code,
      NameExtension: province.NameExtension,
    }));
    res.json(provinces);
  } catch (error) {
    res.status(500).json(error?.response?.data);
  }
};

const getDistrict = async (req, res) => {
  try {
    const response = await axios.get(`${GHN_API_URL}/master-data/district`, {
      headers: {
        Token: GHN_TOKEN,
      },
      params: {
        province_id: req.query.provinceID,
      },
    });
    const dataResponse = response.data;
    const districts = dataResponse?.data.map((district) => ({
      DistrictID: district.DistrictID,
      DistrictName: district.DistrictName,
      ProvinceID: district.ProvinceID,
      Code: district.Code,
      NameExtension: district.NameExtension,
    }));
    res.json(districts);
  } catch (error) {
    res.status(500).json(error?.response?.data);
  }
};

const getWard = async (req, res) => {
  try {
    const response = await axios.get(`${GHN_API_URL}/master-data/ward`, {
      headers: {
        Token: GHN_TOKEN,
      },
      params: {
        district_id: req.query.districtID,
      },
    });
    const dataResponse = response.data;
    const wards = dataResponse?.data.map((ward) => ({
      WardCode: ward.WardCode,
      WardName: ward.WardName,
      DistrictID: ward.DistrictID,
      NameExtension: ward.NameExtension,
    }));
    res.json(wards);
  } catch (error) {
    res.status(500).json(error?.response?.data);
  }
};

const calculateFee = async (req, res) => {
  try {
    const { to_ward_code, to_district_id, insurance_value, weight } = req.query; // Dùng query thay vì body

    if (!to_ward_code || !to_district_id || !insurance_value || !weight) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin tính phí vận chuyển" });
    }

    const response = await axios.get(`${GHN_API_URL}/v2/shipping-order/fee`, {
      headers: {
        Token: GHN_TOKEN,
        ShopId: GHN_SHOP_ID,
      },
      params: {
        service_type_id: GHN_SERVICE_TYPE_NHE,
        to_ward_code,
        to_district_id,
        weight,
        insurance_value,
      },
    });

    if (!response.data || !response.data.data) {
      return res
        .status(400)
        .json({ message: "Không nhận được dữ liệu phí vận chuyển" });
    }

    res.json(response.data);
  } catch (error) {
    console.error(
      "GHN Fee Calculation Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "Lỗi khi tính phí vận chuyển" });
  }
};

const confirmOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate("items.book", "stock")
      .populate("discountUsed");
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.orderStatus !== "Pending") {
      return res.status(400).json({ message: "Đơn hàng đã được xác nhận" });
    }

    if (
      order.paymentMethod === "Online" &&
      order.paymentStatus !== "Completed"
    ) {
      return res.status(400).json({ message: "Đơn hàng chưa được thanh toán" });
    }

    if (order.boxInfo === null) {
      return res.status(400).json({
        message: "Vui lòng nhập thông tin (weight, length, width, height)",
      });
    }

    let totalValue = 0;
    for (const item of order.items) {
      const book = item.book;
      if (book.stock < item.quantity) {
        return res
          .status(400)
          .json({ message: `Sách "${book.title}" không đủ hàng!` });
      }
      totalValue += item.price * item.quantity;
    }

    if (order.discountUsed) {
      if (order.discountUsed.type === "percentage") {
        totalValue -= (totalValue * order.discountUsed.value) / 100;
      } else if (order.discountUsed.type === "fixed") {
        totalValue -= order.discountUsed.value;
      }
    }

    totalValue -= order.pointUsed;

    const response = await axios.post(
      `${GHN_API_URL}/v2/shipping-order/create`,
      {
        payment_type_id: order?.paymentMethod === "COD" ? 2 : 1,
        note: order?.shippingInfo?.note,
        required_note: "KHONGCHOXEMHANG",
        to_name: order?.shippingInfo?.name,
        to_phone: order?.shippingInfo?.phoneNumber,
        to_address: order?.shippingInfo?.address,
        to_province_name: order?.shippingInfo?.provineName,
        to_district_name: order?.shippingInfo?.districtName,
        to_ward_name: order?.shippingInfo?.wardName,
        content: order?._id,
        cod_amount: order?.paymentMethod === "COD" ? totalValue : 0,
        weight: order?.boxInfo?.weight,
        length: order?.boxInfo?.length,
        width: order?.boxInfo?.width,
        height: order?.boxInfo?.height,
        cod_failed_amount: totalValue,
        insurance_value: totalValue,
        service_type_id: 2,
      },
      {
        headers: {
          Token: GHN_TOKEN,
          ShopId: GHN_SHOP_ID,
        },
      }
    );

    const dataResponse = response.data;
    if (dataResponse?.code === 200) {
      order.orderStatus = "Processing";
      const orderCode = dataResponse?.data?.order_code;
      order.trackingNumber = orderCode;

      await Promise.all(
        order.items.map(async (item) => {
          const book = item.book;
          book.stock -= item.quantity;
          await book.save();
        })
      );
      await order.save();
      res
        .status(200)
        .json({ message: "Xác nhận đơn hàng thành công", orderCode });
    } else {
      res.status(400).json({ message: dataResponse?.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error?.response?.data?.message });
  }
};
const getTrackingDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order || !order.trackingNumber)
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hoặc chưa có mã GHN" });

    // GHN API: /v2/shipping-order/detail
    const ghRes = await axios.get(`${GHN_API_URL}/v2/shipping-order/detail`, {
      params: { order_code: order.trackingNumber },
      headers: { Token: GHN_TOKEN, ShopId: GHN_SHOP_ID },
    });

    const data = ghRes.data; // GHN trả về {code, message, data}
    // (tuỳ ý) cập nhật nhanh trạng thái vào DB cho các lần hiển thị sau
    order.shippingStatus = data?.data?.status_name || order.shippingStatus;
    await order.save({ validateBeforeSave: false });

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi lấy trạng thái GHN" });
  }
};

const returnOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order || !order.trackingNumber) {
      return res
        .status(400)
        .json({ message: "Đơn hàng không hợp lệ hoặc chưa có mã GHN." });
    }

    const ghn = await getGhnTracking(order.trackingNumber);
    
    const status = ghn.status?.toLowerCase();

    const ALLOWED_RETURN_STATUSES = [
      "storing",
      "ready_to_pick",
      "ready_to_deliver",
    ];
    if (!ALLOWED_RETURN_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể hoàn đơn. Trạng thái hiện tại: "${status}". Chỉ cho phép hoàn khi đơn đang ở kho hoặc chờ lấy.`,
      });
    }

    const response = await axios.post(
      "https://online-gateway.ghn.vn/shiip/public-api/v2/switch-status/return",
      {
        order_codes: ["GYU3NHHQ"],
      },
      {
        headers: {
          token: "cf17cac7-54cd-11f0-928a-1a690f81b498", // 
          shop_id: 5863644, // 
          "Content-Type": "application/json",
        },
      }
    );

    
    order.isReturned = true;
    await order.save();

    return res.json({
      success: true,
      message: "Yêu cầu hoàn đơn GHN đã được gửi thành công",
      data: response.data,
    });
  } catch (error) {
    console.error("GHN return error:");
    console.error("→ error.code:", error.code); // ECONNREFUSED, ETIMEDOUT, etc

    console.error("→ full message:", error.message);

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message || "Lỗi khi gửi yêu cầu hoàn đơn hàng",
    });
  }
};

const getGhnTracking = async (trackingNumber) => {
  const response = await axios.get(
    "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail",
    {
      headers: {
        Token: process.env.GHN_TOKEN,
        ShopId: process.env.GHN_SHOP_ID,
      },
      params: {
        order_code: trackingNumber,
      },
    }
  );

  return response.data.data;
};

const ghnController = {
  getProvince,
  getDistrict,
  getWard,
  calculateFee,
  confirmOrder,
  getTrackingDetails,
  returnOrder,
  getGhnTracking,
};
module.exports = ghnController;
