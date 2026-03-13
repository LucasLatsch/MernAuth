import { MailtrapClient } from "mailtrap";

const token = process.env.MAILTRAP_TOKEN;

export const mailtrapClient = new MailtrapClient({
  token: token,
});

export const sender = {
  email: "hello@demomailtrap.co",
  name: "Mailtrap Test",
};
