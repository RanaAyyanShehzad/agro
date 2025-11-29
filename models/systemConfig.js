import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema({
  configKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  configValue: {
    type: mongoose.Schema.Types.Mixed, // Can store any type of value
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  }
}, {
  timestamps: true
});

// Predefined config keys
export const CONFIG_KEYS = {
  MAX_TEMP_CELSIUS: "MAX_TEMP_CELSIUS",
  MIN_TEMP_CELSIUS: "MIN_TEMP_CELSIUS",
  FAQ_CONTENT: "FAQ_CONTENT",
  AUTO_CONFIRM_MINUTES: "AUTO_CONFIRM_MINUTES", // Minutes after delivery to auto-confirm
  SHIPPED_TO_DELIVERED_MINUTES: "SHIPPED_TO_DELIVERED_MINUTES", // Minutes before seller can mark as delivered
  DELIVERED_TO_RECEIVED_MINUTES: "DELIVERED_TO_RECEIVED_MINUTES", // Minutes before auto-confirming delivery
  DISPUTE_RESPONSE_MINUTES: "DISPUTE_RESPONSE_MINUTES" // Minutes for seller to respond to dispute before auto-escalation
};

// Initialize default values if not exists
systemConfigSchema.statics.initializeDefaults = async function() {
  const defaults = [
    { configKey: CONFIG_KEYS.MAX_TEMP_CELSIUS, configValue: 42, description: "Maximum temperature threshold for dangerous weather alerts" },
    { configKey: CONFIG_KEYS.MIN_TEMP_CELSIUS, configValue: 2, description: "Minimum temperature threshold for dangerous weather alerts" },
    { configKey: CONFIG_KEYS.AUTO_CONFIRM_MINUTES, configValue: 10, description: "Minutes after delivery to automatically confirm order (for testing)" },
    { configKey: CONFIG_KEYS.SHIPPED_TO_DELIVERED_MINUTES, configValue: 10, description: "Minutes after shipped status before seller can mark as delivered (for testing)" },
    { configKey: CONFIG_KEYS.DELIVERED_TO_RECEIVED_MINUTES, configValue: 10, description: "Minutes after delivered status before auto-confirming (for testing)" },
    { configKey: CONFIG_KEYS.DISPUTE_RESPONSE_MINUTES, configValue: 10, description: "Minutes for seller to respond to dispute before auto-escalation to admin (for testing)" }
  ];

  for (const defaultConfig of defaults) {
    await this.findOneAndUpdate(
      { configKey: defaultConfig.configKey },
      { $setOnInsert: defaultConfig },
      { upsert: true, new: true }
    );
  }
};

export const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

