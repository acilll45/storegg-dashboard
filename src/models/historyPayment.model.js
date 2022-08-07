import { DataTypes, Model } from "sequelize";
import sequelizeConnection from "../config/db.config.js";
import AutoNumberField from "../helpers/autoNumberField.helper.js";
import DayjsUTC from "../helpers/date.helper.js";

class HistoryPayment extends Model {}

HistoryPayment.init(
  {
    history_payment_id: {
      allowNull: true,
      primaryKey: true,
      type: DataTypes.STRING(25),
      field: "history_payment_id",
    },
    account_name: {
      type: DataTypes.STRING(25),
      allowNull: false,
      field: "account_name",
    },
    type: {
      type: DataTypes.STRING(15),
      allowNull: false,
      field: "type",
    },
    bank_name: {
      type: DataTypes.STRING(25),
      allowNull: false,
      field: "bank_name",
    },
    no_rekening: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "no_rekening",
    },
  },
  {
    hooks: {
      beforeBulkCreate: async function (records, options) {
        for (let i = 0; i < records.length; i++) {
          const datePrefix = DayjsUTC().format("DDMMYY");
          const ID = await AutoNumberField(
            "history_payment_id",
            datePrefix,
            12
          );
          records[i].dataValues.history_payment_id = ID;
        }
        options.individualHooks = false;
      },
      beforeCreate: async function (record, options) {
        const datePrefix = DayjsUTC().format("DDMMYY");
        const ID = await AutoNumberField("history_payment_id", datePrefix, 12);
        record.dataValues.history_payment_id = ID;
      },
    },
    sequelize: sequelizeConnection,
    modelName: "HistoryPayments",
    tableName: "gg_history_payments",
    deletedAt: false,
  }
);

export default HistoryPayment;
