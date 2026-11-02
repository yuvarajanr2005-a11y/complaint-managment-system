const mongoose = require('mongoose');

const defaultDepartments = ['Academics', 'Facilities', 'Hostel', 'Transport', 'Cafeteria', 'Student Affairs'];
const defaultCategories = ['Academics', 'Facilities', 'Hostel', 'Transport', 'Cafeteria', 'Other'];
const defaultSuggestions = [
  { title: 'Classroom fan or lights are not working', category: 'Facilities' },
  { title: 'Projector or classroom equipment is not working', category: 'Facilities' },
  { title: 'Hostel water or room maintenance problem', category: 'Hostel' },
  { title: 'College bus is late or overcrowded', category: 'Transport' },
  { title: 'Cafeteria food quality or cleanliness issue', category: 'Cafeteria' },
  { title: 'Need help with an academic issue', category: 'Academics' },
];

const campusConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    departments: {
      type: [String],
      default: defaultDepartments,
    },
    categories: {
      type: [String],
      default: defaultCategories,
    },
    suggestions: [
      {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        category: { type: String, required: true, trim: true, maxlength: 80 },
      },
    ],
  },
  { timestamps: true }
);

campusConfigSchema.statics.getGlobalConfig = async function getGlobalConfig() {
  let config = await this.findOne({ key: 'global' });
  if (!config) {
    config = await this.create({
      key: 'global',
      departments: defaultDepartments,
      categories: defaultCategories,
      suggestions: defaultSuggestions,
    });
  }
  return config;
};

module.exports = mongoose.model('CampusConfig', campusConfigSchema);
