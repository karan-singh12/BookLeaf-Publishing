import Joi from 'joi';

/**
 * One set of validation options and error wording for the whole API, so every endpoint
 * reports problems the same way ("Subject must be at least 3 characters.").
 */
export const JOI_OPTIONS: Joi.ValidationOptions = {
  abortEarly: false, // report every problem at once so a form can show them all
  stripUnknown: true, // silently drop fields the schema doesn't know (e.g. a client-sent `status`)
  errors: { wrap: { label: false } }, // "Subject is required", not "\"Subject\" is required"
  messages: {
    'any.required': '{{#label}} is required.',
    'any.only': '{{#label}} must be one of: {{#valids}}.',
    'string.base': '{{#label}} must be text.',
    'string.empty': '{{#label}} is required.',
    'string.min': '{{#label}} must be at least {{#limit}} characters.',
    'string.max': '{{#label}} must be at most {{#limit}} characters.',
    'string.email': 'Please enter a valid email address.',
    'string.hex': '{{#label}} must be a valid id.',
    'string.length': '{{#label}} must be a valid id.',
    'number.base': '{{#label}} must be a number.',
    'number.integer': '{{#label}} must be a whole number.',
    'number.min': '{{#label}} must be at least {{#limit}}.',
    'number.max': '{{#label}} must be at most {{#limit}}.',
    'boolean.base': '{{#label}} must be true or false.',
    'date.base': '{{#label}} must be a valid date.',
    'date.format': '{{#label}} must be an ISO date (YYYY-MM-DD).',
    'date.min': '{{#label}} must not be before {{#limit}}.',
    'array.base': '{{#label}} must be a list.',
    'array.max': '{{#label}} can have at most {{#limit}} items.',
    'object.base': 'A JSON object is required.',
    'object.min': 'Provide at least one field to update.',
  },
};
