import { User } from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
  sendPassordResetEmail,
  sendResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../mailtrap/emails.js";

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "Authenticated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const signUp = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password || !name) {
      throw new Error("All fields are required");
    }

    // Check if the user already exists
    const userAlredyExists = await User.findOne({ email });

    if (userAlredyExists) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // Hash the password before saving the user
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Generate a unique verification token for email verification
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Create a new user with the hashed password and verification token
    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // Token expires in 24 hours
    });

    // Save the user to the database
    await user.save();

    // Generate a token and set it as a cookie
    generateTokenAndSetCookie(res, user._id);

    if (process.env.NODE_ENV === "production") {
      await sendVerificationEmail(user.email, verificationToken);
    }

    console.log(
      "User created successfully:",
      user.email + " | " + verificationToken,
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { ...user._doc, password: undefined },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res
      .status(400)
      .json({ success: false, message: "Verification code is required" });
  }

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    if (process.env.NODE_ENV === "production") {
      await sendWelcomeEmail(user.email, user.name);
    }

    console.log(
      "Email verified successfully for user:",
      user.email + " | " + user.name,
    );

    return res.status(200).json({
      success: true,
      message: "Welcome email sent successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    generateTokenAndSetCookie(res, user._id);

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: { ...user._doc, password: undefined },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // Token expires in 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    if (process.env.NODE_ENV === "production") {
      await sendPassordResetEmail(user.email, resetURL);
    }

    console.log(
      "Reset Link: ",
      resetURL + " | " + resetToken + " | " + resetTokenExpiresAt,
    );

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    if (process.env.NODE_ENV === "production") {
      await sendResetSuccessEmail(user.email);
    }

    console.log("Password reset successful for user:", user.email);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};
