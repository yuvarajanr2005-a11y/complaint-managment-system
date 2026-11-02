const CampusConfig = require('../models/CampusConfig');

async function getConfig(req, res, next) {
  try {
    const config = await CampusConfig.getGlobalConfig();
    res.json({
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
  } catch (error) {
    next(error);
  }
}

async function addDepartment(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({ message: 'Department name must be between 2 and 50 characters.' });
    }
    const config = await CampusConfig.getGlobalConfig();
    const exists = config.departments.some((d) => d.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: 'This department already exists.' });
    }
    config.departments.push(name);
    if (!config.categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      config.categories.push(name);
    }
    await config.save();
    req.app.get('io')?.emit('config:updated', {
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
    res.json({
      message: `Department "${name}" added successfully.`,
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
  } catch (error) {
    next(error);
  }
}

async function removeDepartment(req, res, next) {
  try {
    const name = decodeURIComponent(req.params.name);
    const config = await CampusConfig.getGlobalConfig();
    if (config.departments.length <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last remaining department.' });
    }
    config.departments = config.departments.filter((d) => d.toLowerCase() !== name.toLowerCase());
    config.categories = config.categories.filter((c) => c.toLowerCase() !== name.toLowerCase());
    config.suggestions = config.suggestions.filter((s) => s.category.toLowerCase() !== name.toLowerCase());
    await config.save();
    req.app.get('io')?.emit('config:updated', {
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
    res.json({
      message: `Department "${name}" removed.`,
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
  } catch (error) {
    next(error);
  }
}

async function addSuggestion(req, res, next) {
  try {
    const { title, category } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ message: 'Suggestion title must be between 1 and 120 characters.' });
    }
    if (typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ message: 'Please select a valid category for this suggestion.' });
    }
    const config = await CampusConfig.getGlobalConfig();
    config.suggestions.push({ title: title.trim(), category: category.trim() });
    await config.save();
    req.app.get('io')?.emit('config:updated', {
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
    res.json({
      message: 'Suggestion added.',
      suggestions: config.suggestions,
    });
  } catch (error) {
    next(error);
  }
}

async function removeSuggestion(req, res, next) {
  try {
    const id = req.params.id;
    const config = await CampusConfig.getGlobalConfig();
    config.suggestions = config.suggestions.filter((s) => s._id.toString() !== id);
    await config.save();
    req.app.get('io')?.emit('config:updated', {
      departments: config.departments,
      categories: config.categories,
      suggestions: config.suggestions,
    });
    res.json({
      message: 'Suggestion removed.',
      suggestions: config.suggestions,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getConfig,
  addDepartment,
  removeDepartment,
  addSuggestion,
  removeSuggestion,
};
