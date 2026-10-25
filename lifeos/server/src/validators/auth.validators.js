'use strict';

const { z } = require('zod');

const emailField = z.string().trim().toLowerCase().email('Enter a valid email address').max(120);
const passwordField = z.string().min(10, 'Use at least 10 characters').max(128);

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(60),
    email: emailField,
    password: passwordField,
  })
  .strict();

const loginSchema = z
  .object({
    email: emailField,
    password: z.string().min(1, 'Enter your password').max(128),
  })
  .strict();

const hexToken = z.string().regex(/^[0-9a-fA-F]{64}$/);
const verifyEmailSchema = z.object({ token: hexToken }).strict();

const forgotPasswordSchema = z.object({ email: emailField }).strict();

const resetPasswordSchema = z.object({ token: hexToken, password: passwordField }).strict();

const meIdSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }).strict();

const updateMeSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(60).optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(400)
      .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'Enter a valid http(s) URL or clear the field')
      .optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    locale: z.string().trim().min(1).max(10).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(128),
    newPassword: passwordField,
  })
  .strict();

const deleteMeSchema = z.object({ password: z.string().min(1, 'Enter your password to confirm').max(128) }).strict();

const dashboardLayoutItemSchema = z
  .object({
    widgetId: z.string().min(1).max(40),
    order: z.coerce.number().int().min(0).max(99),
    hidden: z.boolean().default(false),
  })
  .strict();

const prefsUpdateSchema = z
  .object({
    prefs: z
      .object({
        weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
        currency: z.string().trim().min(1).max(3).optional(),
        themeColor: z.string().trim().max(24).optional(),
        dashboardLayout: z.array(dashboardLayoutItemSchema).max(50).optional(),
        savedViews: z
          .array(
            z
              .object({
                name: z.string().min(1).max(40),
                entity: z.string().min(1).max(30),
                filters: z.record(z.string(), z.unknown()).default({}),
                sort: z
                  .object({ field: z.string().max(40), dir: z.enum(['asc', 'desc']) })
                  .strict()
                  .optional(),
              })
              .strict(),
          )
          .max(50)
          .optional(),
      })
      .strict()
      .optional(),
    notifPrefs: z
      .object({
        digestHour: z.coerce.number().int().min(0).max(23).optional(),
        channels: z
          .object({ inApp: z.boolean(), email: z.boolean() })
          .strict()
          .optional(),
        quietHours: z
          .object({
            enabled: z.boolean(),
            from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
            to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
          })
          .strict()
          .optional(),
        kinds: z
          .object({
            taskReminder: z.boolean().optional(),
            habitReminder: z.boolean().optional(),
            goalDeadline: z.boolean().optional(),
            weeklyReport: z.boolean().optional(),
            weeklyPriorities: z.boolean().optional(),
            digest: z.boolean().optional(),
            system: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    privacy: z
      .object({
        appLockEnabled: z.boolean().optional(),
        appLockPin: z.string().regex(/^\d{4,8}$/, 'PIN is 4-8 digits').optional(),
        e2eeJournal: z
          .object({ enabled: z.boolean(), hint: z.string().max(120).default('') })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict({ message: 'Send full sections (prefs / notifPrefs / privacy); partial sections are merged.' });

const adminUpdateUserSchema = z
  .object({ role: z.enum(['user', 'admin']).optional(), disabled: z.boolean().optional() })
  .strict()
  .refine((d) => d.role !== undefined || d.disabled !== undefined, { message: 'Nothing to update.' });

module.exports = {
  emailField,
  passwordField,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  meIdSchema,
  updateMeSchema,
  changePasswordSchema,
  deleteMeSchema,
  prefsUpdateSchema,
  adminUpdateUserSchema,
};
