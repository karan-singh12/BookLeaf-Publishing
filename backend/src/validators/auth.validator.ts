import Joi from 'joi';

export const loginBody = Joi.object({
  email: Joi.string().trim().lowercase().email().required().label('Email'),
  password: Joi.string().min(1).max(128).required().label('Password'),
});

export const onboardAuthorBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().label('Author Name'),
  email: Joi.string().trim().lowercase().email().required().label('Email'),
  password: Joi.string().min(6).max(128).optional().default('Password123!').label('Password'),
  phone: Joi.string().trim().max(30).optional().allow('').label('Phone'),
  city: Joi.string().trim().max(100).optional().allow('').label('City'),
  authorCode: Joi.string().trim().uppercase().max(20).optional().allow('').label('Author Code'),
});
