/**
 * Lightweight schema validator middleware generator
 * @param {Object} rules - Object mapping field name to validation functions
 * Example:
 * validateBody({
 *   title: (v) => v && v.trim().length > 0 ? null : 'Title is required',
 *   amount: (v) => !isNaN(v) && Number(v) > 0 ? null : 'Amount must be greater than zero'
 * })
 */
const validateBody = (rules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, validator] of Object.entries(rules)) {
      const val = req.body[field];
      const err = validator(val, req.body);
      if (err) {
        errors.push({ field, message: err });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.map((e) => e.message).join('; '),
        errors
      });
    }

    next();
  };
};

module.exports = {
  validateBody
};
