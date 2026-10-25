import Joi from 'joi';

export const loginBody = Joi.object({
  email: Joi.string().trim().lowercase().email().required().label('Email'),
  password: Joi.string().min(1).max(128).required().label('Password'),
});
