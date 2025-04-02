const { Schema, model } = require("mongoose");

const gigSchema = new Schema(
  {
    developerId: String,
    client: String,
    price: String,
    duration: String,
    name: String,
    description:String
  },
  { timestamps: true }
);

const Gig = model("Gig", gigSchema)
module.exports = Gig