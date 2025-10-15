require("dotenv").config();
const axios = require("axios");

const { GHN_API_URL, GHN_TOKEN } = process.env;

/**
 * ✅ Lấy danh sách Tỉnh / Thành phố
 */
const getProvince = async (req, res) => {
  try {
    const response = await axios.get(`${GHN_API_URL}/master-data/province`, {
      headers: { Token: GHN_TOKEN },
    });
    const provinces = response.data?.data?.map((p) => ({
      ProvinceID: p.ProvinceID,
      ProvinceName: p.ProvinceName,
    }));
    res.json({ success: true, data: provinces });
  } catch (error) {
    console.error("GHN getProvince error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Không lấy được danh sách tỉnh" });
  }
};

/**
 * ✅ Lấy danh sách Quận / Huyện theo ProvinceID
 */
const getDistrict = async (req, res) => {
  try {
    const { provinceID } = req.query;
    if (!provinceID)
      return res.status(400).json({ message: "Thiếu provinceID" });

    const response = await axios.get(`${GHN_API_URL}/master-data/district`, {
      headers: { Token: GHN_TOKEN },
      params: { province_id: provinceID },
    });
    const districts = response.data?.data?.map((d) => ({
      DistrictID: d.DistrictID,
      DistrictName: d.DistrictName,
    }));
    res.json({ success: true, data: districts });
  } catch (error) {
    console.error("GHN getDistrict error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Không lấy được danh sách quận/huyện" });
  }
};

/**
 * ✅ Lấy danh sách Phường / Xã theo DistrictID
 */
const getWard = async (req, res) => {
  try {
    const { districtID } = req.query;
    if (!districtID)
      return res.status(400).json({ message: "Thiếu districtID" });

    const response = await axios.get(`${GHN_API_URL}/master-data/ward`, {
      headers: { Token: GHN_TOKEN },
      params: { district_id: districtID },
    });
    const wards = response.data?.data?.map((w) => ({
      WardCode: w.WardCode,
      WardName: w.WardName,
    }));
    res.json({ success: true, data: wards });
  } catch (error) {
    console.error("GHN getWard error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Không lấy được danh sách phường/xã" });
  }
};

module.exports = {
  getProvince,
  getDistrict,
  getWard,
};
