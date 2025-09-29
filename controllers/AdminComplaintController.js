const Complaint = require("../models/Complaint");

const getAllComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find().populate("user", "email");
        res.status(200).json({ data: complaints });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updatedComplaint = await Complaint.findByIdAndUpdate(id, { status }, { new: true });
        res.status(200).json({ data: updatedComplaint });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};


const complaintController = { getAllComplaints, updateComplaintStatus };

module.exports = complaintController;