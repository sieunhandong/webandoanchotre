const express = require("express");
const AddressController = require("../controllers/AddressController");
const router = express.Router({ mergeParams: true });

// GET /addresses/users/:userId
router.get("/", AddressController.getAll);

// POST /addresses/users/:userId
router.post("/", AddressController.create);

// PUT /addresses/users/:userId
router.put("/:addrId", AddressController.update);

// DELETE /addresses/users/:userId/
router.delete("/:addrId", AddressController.remove);

// PATCH /addresses/users/:userId/default
router.patch("/:addrId/default", AddressController.setDefault);

module.exports = router;
