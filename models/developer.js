const { Schema, model } = require("mongoose");

const developerSchema = new Schema(
  {
    name: String,
    level: String,
    gigs: [String], //Gig id array
    username:String
  },
  { timestamps: true }
);

const Developer = model("Developer", developerSchema);
module.exports = Developer;