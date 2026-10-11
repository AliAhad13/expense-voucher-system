
const express = require("express");
const crypto = require("crypto");
const Voucher = require("../models/Voucher");
const { protect, allowRoles } = require("../middleware/auth");
const upload = require("../middleware/upload");
const router = express.Router();

// Generate a unique voucher number
const generateVoucherNumber = () => {
  const year = new Date().getFullYear();
  const uniquePart = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `VCH-${year}-${uniquePart}`;
};

// Create a new draft voucher
router.post(
  "/",
  protect,
  allowRoles("employee"),
  async (req, res) => {
    try {
      const {
        department,
        expenseTitle,
        category,
        description,
        amount,
        expenseDate,
      } = req.body;

      if (
        !department?.trim() ||
        !expenseTitle?.trim() ||
        !category ||
        !expenseDate ||
        amount === undefined ||
        amount === null ||
        amount === ""
      ) {
        return res.status(400).json({
          message: "Please provide all required voucher details",
        });
      }

      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          message: "Amount must be greater than zero",
        });
      }

      const parsedExpenseDate = new Date(expenseDate);

      if (Number.isNaN(parsedExpenseDate.getTime())) {
        return res.status(400).json({
          message: "Please provide a valid expense date",
        });
      }

      const voucher = await Voucher.create({
        voucherNumber: generateVoucherNumber(),
        employee: req.user.id,
        department: department.trim(),
        expenseTitle: expenseTitle.trim(),
        category,
        description: description || "",
        amount: numericAmount,
        expenseDate: parsedExpenseDate,
        status: "Draft",
      });

      res.status(201).json({
        message: "Draft voucher created successfully",
        voucher,
      });
    } catch (error) {
      console.error("Create voucher error:", error.message);

      res.status(500).json({
        message: "Unable to create voucher",
      });
    }
  }
);

// View vouchers belonging to the logged-in employee
router.get(
  "/my",
  protect,
  allowRoles("employee"),
  async (req, res) => {
    try {
      const vouchers = await Voucher.find({
        employee: req.user.id,
      }).sort({ createdAt: -1 });

      res.json(vouchers);
    } catch (error) {
      res.status(500).json({
        message: "Unable to fetch your vouchers",
      });
    }
  }
);

// View one of the employee's own vouchers
router.get(
  "/:id",
  protect,
  allowRoles("employee"),
  async (req, res) => {
    try {
      const voucher = await Voucher.findOne({
        _id: req.params.id,
        employee: req.user.id,
      });

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      res.json(voucher);
    } catch (error) {
      res.status(400).json({
        message: "Invalid voucher ID",
      });
    }
  }
);

// Edit a draft voucher
router.put(
  "/:id",
  protect,
  allowRoles("employee"),
  async (req, res) => {
    try {
      const voucher = await Voucher.findOne({
        _id: req.params.id,
        employee: req.user.id,
      });

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Draft") {
        return res.status(403).json({
          message: "Only draft vouchers can be edited",
        });
      }

      const allowedFields = [
        "department",
        "expenseTitle",
        "category",
        "description",
        "amount",
        "expenseDate",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          voucher.set(field, req.body[field]);
        }
      }

      await voucher.save();

      res.json({
        message: "Draft voucher updated successfully",
        voucher,
      });
    } catch (error) {
      res.status(400).json({
        message: "Unable to update voucher. Check the supplied details.",
      });
    }
  }
);

// Delete a draft voucher
router.delete(
  "/:id",
  protect,
  allowRoles("employee"),
  async (req, res) => {
    try {
      const voucher = await Voucher.findOne({
        _id: req.params.id,
        employee: req.user.id,
      });

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Draft") {
        return res.status(403).json({
          message: "Only draft vouchers can be deleted",
        });
      }

      await voucher.deleteOne();

      res.json({
        message: "Draft voucher deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "Unable to delete voucher",
      });
    }
  }
);

// Submit a draft voucher for approval
router.patch(
  "/:id/submit",
  protect,
  allowRoles("employee"),
  async (req, res) => {
    try {
      const voucher = await Voucher.findOne({
        _id: req.params.id,
        employee: req.user.id,
      });

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Draft") {
        return res.status(400).json({
          message: "Only draft vouchers can be submitted",
        });
      }

      if (!voucher.employeeSignature) {
        return res.status(400).json({
          message: "Upload your signature before submitting",
        });
      }

      voucher.status = "Submitted";
      await voucher.save();

      res.json({
        message: "Voucher submitted for approval",
        voucher,
      });
    } catch (error) {
      res.status(400).json({
        message: "Unable to submit voucher",
      });
    }
  }
);


router.post(
  "/:id/employee-signature",
  protect,
  allowRoles("employee"),
  upload.single("signature"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a signature image",
        });
      }

      const voucher = await Voucher.findOne({
        _id: req.params.id,
        employee: req.user.id,
      });

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Draft") {
        return res.status(403).json({
          message: "Signature can only be added to a draft",
        });
      }

      voucher.employeeSignature = `/uploads/${req.file.filename}`;
      await voucher.save();

      res.json({
        message: "Employee signature uploaded successfully",
        signature: voucher.employeeSignature,
      });
    } catch (error) {
      res.status(400).json({
        message: "Unable to upload employee signature",
      });
    }
  }
);


router.post(
  "/:id/director-signature",
  protect,
  allowRoles("director"),
  upload.single("signature"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a signature image",
        });
      }

      const voucher = await Voucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Submitted") {
        return res.status(400).json({
          message: "Only submitted vouchers can be approved",
        });
      }

      voucher.directorSignature = `/uploads/${req.file.filename}`;
      await voucher.save();

      res.json({
        message: "Director signature uploaded successfully",
        signature: voucher.directorSignature,
      });
    } catch (error) {
      res.status(400).json({
        message: "Unable to upload director signature",
      });
    }
  }
);

router.post(
  "/:id/director-signature",
  protect,
  allowRoles("director"),
  upload.single("signature"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a signature image",
        });
      }

      const voucher = await Voucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Submitted") {
        return res.status(400).json({
          message: "Only submitted vouchers can be approved",
        });
      }

      voucher.directorSignature = `/uploads/${req.file.filename}`;
      await voucher.save();

      res.json({
        message: "Director signature uploaded successfully",
        signature: voucher.directorSignature,
      });
    } catch (error) {
      res.status(400).json({
        message: "Unable to upload director signature",
      });
    }
  }
);


const isValidId = (id) =>
  /^[a-fA-F0-9]{24}$/.test(id);

// Director: view all vouchers

router.get(
  "/director/all",
  protect,
  allowRoles("director"),
  async (req, res) => {
    try {
      const {
        status,
        department,
        category,
        employeeName,
        voucherNumber,
        from,
        to,
        minAmount,
        maxAmount,
        sort,
      } = req.query;

      const filter = {};

      // Filter by voucher status
      if (status) {
        filter.status = status;
      }

      // Filter by department
      if (department?.trim()) {
        filter.department = {
          $regex: department.trim(),
          $options: "i",
        };
      }

      // Filter by expense category
      if (category?.trim()) {
        filter.category = category.trim();
      }

      // Filter by voucher number
      if (voucherNumber?.trim()) {
        filter.voucherNumber = {
          $regex: voucherNumber.trim(),
          $options: "i",
        };
      }

      // Filter by expense amount
      if (minAmount !== undefined && minAmount !== "") {
        const min = Number(minAmount);

        if (!Number.isFinite(min)) {
          return res.status(400).json({
            message: "Invalid minimum amount",
          });
        }

        filter.amount = {
          ...filter.amount,
          $gte: min,
        };
      }

      if (maxAmount !== undefined && maxAmount !== "") {
        const max = Number(maxAmount);

        if (!Number.isFinite(max)) {
          return res.status(400).json({
            message: "Invalid maximum amount",
          });
        }

        filter.amount = {
          ...filter.amount,
          $lte: max,
        };
      }

      // Filter by expense date
      if (from || to) {
        filter.expenseDate = {};

        if (from) {
          const startDate = new Date(`${from}T00:00:00.000Z`);

          if (Number.isNaN(startDate.getTime())) {
            return res.status(400).json({
              message: "Invalid start date",
            });
          }

          filter.expenseDate.$gte = startDate;
        }

        if (to) {
          const endDate = new Date(`${to}T23:59:59.999Z`);

          if (Number.isNaN(endDate.getTime())) {
            return res.status(400).json({
              message: "Invalid end date",
            });
          }

          filter.expenseDate.$lte = endDate;
        }
      }

      // Filter by employee name
      if (employeeName?.trim()) {
        const User = require("../models/User");

        const matchingUsers = await User.find({
          name: {
            $regex: employeeName.trim(),
            $options: "i",
          },
        }).select("_id");

        filter.employee = {
          $in: matchingUsers.map((user) => user._id),
        };
      }

      // Safe sorting options
      const sortOptions = {
        createdAt: { createdAt: -1 },
        expenseDate: { expenseDate: -1 },
        amount: { amount: -1 },
        status: { status: 1 },
        voucherNumber: { voucherNumber: 1 },
      };

      const sortBy =
        sortOptions[sort] || sortOptions.createdAt;

      const vouchers = await Voucher.find(filter)
        .populate("employee", "name email employeeId department")
        .populate("approvedBy", "name email")
        .sort(sortBy);

      return res.status(200).json(vouchers);
    } catch (error) {
      console.error("Director voucher filter error:", error);

      return res.status(500).json({
        message: "Unable to retrieve vouchers",
      });
    }
  }
);


// Director: approve a submitted voucher
router.patch(
  "/:id/approve",
  protect,
  allowRoles("director"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid voucher ID",
        });
      }

      const voucher = await Voucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Submitted") {
        return res.status(400).json({
          message: "Only submitted vouchers can be approved",
        });
      }

      if (!voucher.directorSignature) {
        return res.status(400).json({
          message: "Upload the Director signature before approval",
        });
      }

      voucher.status = "Approved";
      voucher.approvalDate = new Date();
      voucher.approvedBy = req.user.id;
      voucher.rejectionReason = "";

      await voucher.save();

      res.json({
        message: "Voucher approved successfully",
        voucher,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unable to approve voucher",
      });
    }
  }
);

// Director: reject a submitted voucher
router.patch(
  "/:id/reject",
  protect,
  allowRoles("director"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid voucher ID",
        });
      }

      const { rejectionReason } = req.body;

      if (
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim()
      ) {
        return res.status(400).json({
          message: "Rejection reason is required",
        });
      }

      const voucher = await Voucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          message: "Voucher not found",
        });
      }

      if (voucher.status !== "Submitted") {
        return res.status(400).json({
          message: "Only submitted vouchers can be rejected",
        });
      }

      voucher.status = "Rejected";
      voucher.rejectionReason = rejectionReason.trim();
      voucher.approvalDate = null;
      voucher.approvedBy = null;
      voucher.directorSignature = "";

      await voucher.save();

      res.json({
        message: "Voucher rejected successfully",
        voucher,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unable to reject voucher",
      });
    }
  }
);


router.get(
  "/accounts/all",
  protect,
  allowRoles("accounts"),
  async (req, res) => {
    try {
      const {
        status,
        department,
        category,
        employeeName,
        voucherNumber,
        from,
        to,
        minAmount,
        maxAmount,
        sort,
      } = req.query;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (department?.trim()) {
        filter.department = {
          $regex: department.trim(),
          $options: "i",
        };
      }

      if (category?.trim()) {
        filter.category = category.trim();
      }

      if (voucherNumber?.trim()) {
        filter.voucherNumber = {
          $regex: voucherNumber.trim(),
          $options: "i",
        };
      }

      if (minAmount !== undefined && minAmount !== "") {
        const min = Number(minAmount);

        if (!Number.isFinite(min)) {
          return res.status(400).json({
            message: "Invalid minimum amount",
          });
        }

        filter.amount = {
          ...filter.amount,
          $gte: min,
        };
      }

      if (maxAmount !== undefined && maxAmount !== "") {
        const max = Number(maxAmount);

        if (!Number.isFinite(max)) {
          return res.status(400).json({
            message: "Invalid maximum amount",
          });
        }

        filter.amount = {
          ...filter.amount,
          $lte: max,
        };
      }

      if (from || to) {
        filter.expenseDate = {};

        if (from) {
          const start = new Date(`${from}T00:00:00.000Z`);

          if (Number.isNaN(start.getTime())) {
            return res.status(400).json({
              message: "Invalid start date",
            });
          }

          filter.expenseDate.$gte = start;
        }

        if (to) {
          const end = new Date(`${to}T23:59:59.999Z`);

          if (Number.isNaN(end.getTime())) {
            return res.status(400).json({
              message: "Invalid end date",
            });
          }

          filter.expenseDate.$lte = end;
        }
      }

      if (employeeName?.trim()) {
        const User = require("../models/User");

        const users = await User.find({
          name: {
            $regex: employeeName.trim(),
            $options: "i",
          },
        }).select("_id");

        filter.employee = {
          $in: users.map((user) => user._id),
        };
      }

      const sortOptions = {
        createdAt: { createdAt: -1 },
        expenseDate: { expenseDate: -1 },
        amount: { amount: -1 },
        status: { status: 1 },
        voucherNumber: { voucherNumber: 1 },
      };

      const vouchers = await Voucher.find(filter)
        .populate("employee", "name email department")
        .populate("approvedBy", "name email")
        .sort(sortOptions[sort] || sortOptions.createdAt);

      res.status(200).json(vouchers);
    } catch (error) {
      console.error("Accounts voucher filter error:", error);

      res.status(500).json({
        message: "Unable to retrieve vouchers",
      });
    }
  }
);


router.get(
  "/accounts/search",
  protect,
  allowRoles("accounts"),
  async (req, res) => {
    try {
      const {
        status,
        department,
        category,
        employeeName,
      } = req.query;

      const filter = {};

      if (status) filter.status = status;
      if (department) filter.department = department;
      if (category) filter.category = category;

      if (employeeName) {
        const users = await require("../models/User").find({
          name: { $regex: employeeName, $options: "i" },
        }).select("_id");

        filter.employee = { $in: users.map((user) => user._id) };
      }

      const vouchers = await Voucher.find(filter)
        .populate("employee", "name email employeeId department")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 });

      res.json(vouchers);
    } catch (error) {
      res.status(500).json({
        message: "Unable to search vouchers",
      });
    }
  }
);


module.exports = router;
