import dayjs from "dayjs";
import Sequelize from "sequelize";
import { validationResult } from "express-validator";
import {
  httpStatusCodes,
  ROLES,
  USER_STATUS,
} from "../../constants/index.constants.js";
import { ComparePassword } from "../../helpers/authentication.helper.js";
import BaseError, {
  TransfromError,
  ValidationError,
} from "../../helpers/baseError.helper.js";
import {
  HTMLScript,
  HTMLStylesheet,
  ToCapitalize,
  ToPlainObject,
  UnlinkFile,
} from "../../helpers/index.helper.js";
import {
  findAllAdmin,
  findOneAdmin,
  updateAdmin,
} from "../admin/admin.repository.js";
import Transaction from "../../models/transaction.model.js";
import {
  findListUserRoles,
  findListUserStatus,
} from "../user/user.repository.js";

const Op = Sequelize.Op;

export const getListAdmin = async (req, res, next) => {
  try {
    const flashdata = req.flash("flashdata");
    const errors = req.flash("errors")[0];
    let listAdmin = await findAllAdmin({});
    let countUsers = listAdmin.length;

    listAdmin = ToPlainObject(listAdmin);

    listAdmin.length !== 0 &&
      listAdmin.map(u => {
        u.created_at = dayjs(u.created_at).format("DD MMM YYYY");

        return { ...u };
      });

    res.render("user/admin/v_list_admin", {
      title: "List Admin",
      path: "/admin",
      flashdata: flashdata,
      errors: errors,
      // users: [],
      users: listAdmin,
      countUsers,
      isEdit: false,
      values: null,
    });
  } catch (error) {
    const baseError = new TransfromError(error);
    next(baseError);
  }
};

export const getDetailAdmin = async (req, res, next) => {
  const ID = req.params.id;

  try {
    let admin = await findOneAdmin({
      where: {
        admin_id: ID,
      },
    });

    if (!admin) {
      throw new BaseError("NOT_FOUND", 404, "Admin is not found!", true, {
        errorView: "errors/404",
        renderData: {
          title: "Page Not Found",
        },
        responseType: "page",
      });
    }

    admin = ToPlainObject(admin);

    if (admin.admin_id == req.user.admin_id) {
      return res.redirect("/profile");
    }

    console.log(req.user);
    const adminVouchers = await Promise.all(
      admin.vouchers.map(async vcr => {
        const countTr = await Transaction.count({
          where: {
            voucher_id: vcr.voucher_id,
          },
        });
        vcr.created_at = dayjs(vcr.created_at).format("DD MMM YYYY");
        return { ...vcr, count: countTr };
      })
    );

    admin.vouchers = adminVouchers;

    res.render("user/admin/v_detail", {
      title: admin.admin_id,
      path: "/admin",
      // flashdata: flashdata,
      // errors: errors,
      admin: admin,
    });
  } catch (error) {
    const baseError = new TransfromError(error);
    next(baseError);
  }
};

export const putAdmin = async (req, res, next) => {
  const ID = req.params.id;
  const {
    name,
    username,
    email,
    status,
    phone_number,
    role,
    address,
    regency,
    city,
  } = req.body;
  const fileimg = req.fileimg;
  const isUpload = fileimg.data ? true : false;
  try {
    let admin = await findOneAdmin({
      where: {
        admin_id: ID,
      },
    });

    if (!admin) {
      req.flash("flashdata", {
        type: "error",
        title: "Oppss",
        message: `Gagal mengubah data admin, karena admin dengan ID <strong>${ID}</strong> tidak di temukan`,
      });
      return res.redirect("back");
    }

    if (admin.admin_id == req.user.admin_id) {
      req.flash("flashdata", {
        type: "warning",
        title: "Peringatan",
        message: `Data yang diubah merupakan data sesi user saat ini`,
      });
      return res.redirect("/profile");
    }

    const splitReqAddress = address.split(",");
    let joinAddress = {
      country: "Indonesia",
      regency: regency,
      city: city,
      districts: splitReqAddress[splitReqAddress.length - 1],
      ward: splitReqAddress[3],
      RT_RW: splitReqAddress[2],
      house: splitReqAddress[1],
      street: splitReqAddress[0],
    };

    joinAddress = JSON.stringify(joinAddress);

    const payload = {
      admin_id: admin.admin_id,
      user_id: admin.user.user_id,
      name,
      username,
      email,
      status,
      phone_number,
      role,
      address: joinAddress,
      fileimg,
      oldAvatar: admin.user.avatar,
    };

    await updateAdmin(payload);

    req.flash("flashdata", {
      type: "success",
      title: "Diubah!",
      message: "Berhasil mengubah data admin",
    });
    res.redirect("back");
  } catch (error) {
    if (isUpload) {
      UnlinkFile(fileimg.data.path);
    }
    req.flash("flashdata", {
      type: "error",
      title: "Opps!",
      message: "Gagal mengubah data",
    });
    res.redirect("back");
  }
};

export const viewEditAdmin = async (req, res, next) => {
  const ID = req.params.id;

  HTMLStylesheet(
    [
      ["/vendors/css/forms/select/select2.min.css", "vendors"],
      ["/css/forms/form-validation.css", "pages"],
    ],
    res
  );

  HTMLScript(
    [
      ["/vendors/js/forms/select/select2.full.min.js", "pages"],
      ["/vendors/js/forms/validation/jquery.validate.min.js", "pages"],
      ["/vendors/js/forms/cleave/cleave.min.js", "pages"],
      ["/vendors/js/forms/cleave/addons/cleave-phone.id.js", "pages"],
      ["/vendors/js/forms/cleave/addons/cleave-phone.us.js", "pages"],
    ],
    res
  );

  try {
    const flashdata = req.flash("flashdata");
    const errors = req.flash("errors")[0];

    let admin = await findOneAdmin({
      where: {
        admin_id: ID,
      },
    });

    if (!admin) {
      throw new BaseError("NOT_FOUND", 404, "Admin is not found!", true, {
        errorView: "errors/404",
        renderData: {
          title: "Page Not Found",
        },
        responseType: "page",
      });
    }

    if (admin.admin_id == req.user.admin_id) {
      return res.redirect("/profile");
    }

    admin = ToPlainObject(admin);

    const address = JSON.parse(admin.address);
    admin.city = address.city;
    admin.regency = address.regency;
    admin.address = `${address.street},${address.house},${address.RT_RW},${address.ward},${address.districts}`;

    const roles = findListUserRoles(admin.user.role);
    const status = findListUserStatus(admin.user.status);

    res.render("user/admin/v_edit_admin", {
      title: `Pengaturan ${admin.admin_id}`,
      path: "/admin",
      roles: roles,
      status: status,
      flashdata: flashdata,
      errors: errors,
      admin: admin,
    });
  } catch (error) {
    const baseError = new TransfromError(error);
    next(baseError);
  }
};
