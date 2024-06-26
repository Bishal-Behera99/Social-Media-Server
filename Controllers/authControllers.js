const User = require("../models/User");
const { error, success } = require("../utils/responseWrapper");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const signupController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // E1

    if (!name || !email || !password) {
      return res.send(error(400, "All fields are required"));
    }

    // Check if user is already present

    const olduser = await User.findOne({ email });

    if (olduser) {
      return res.send(error(403, "User Is Already Registered"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });
    // (MongoServerError: E11000 duplicate key error collection)-due to we havent  save the db
    await newUser.save();
    return res.send(success(201, { newUser }));
  } catch (e) {
    // (Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client)-missed return statement

    return res.send(error(500, e.message));
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.send(error(400, "All fields are required"));
    }

    // Check if user is not present

    const olduser = await User.findOne({ email }).select("+password");

    if (!olduser) {
      return res.send(error(403, "User Is not Registered"));
    }

    const matchedPassword = await bcrypt.compare(password, olduser.password);

    if (!matchedPassword) {
      return res.send(error(401, "Incorrect Password"));
    }
    const accesstoken = generateaccessToken({ _id: olduser._id });
    const refreshtoken = generaterefreshToken({ _id: olduser._id });

    res.cookie("jwt", refreshtoken, {
      // Frontend cannot access the cookie
      httpOnly: true,
      secure: true,
    });
    return res.send(success(200, { accesstoken }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

// Refresh Api Controller

const refreshController = async (req, res) => {
  try {
    const cookies = req.cookies;

    if (!cookies.jwt) {
      return res.send(error(401, "refreshToken in Cookie is Required"));
    }
    const refreshtoken = cookies.jwt;

    if (!refreshtoken) {
      return res.send(error(401, "RefreshToken is required"));
    }
    const decoded = jwt.verify(refreshtoken, process.env.REFRESH_TOKEN_KEY);

    const _id = decoded._id;

    const accesstoken = generateaccessToken({ _id });

    return res.send(success(201, { accesstoken }));
  } catch (e) {
    return res.send(
      error(401, "Invalid refresh token or Refresh Token is expired")
    );
  }
};

// Internal Functions
function generateaccessToken(data) {
  try {
    const token = jwt.sign(data, process.env.ACCESS_TOKEN_KEY, {
      expiresIn: "30s",
    });
    return token;
  } catch (e) {
    return res.send(error(500, e.message));
  }
}

function generaterefreshToken(data) {
  try {
    const token = jwt.sign(data, process.env.REFRESH_TOKEN_KEY, {
      expiresIn: "1y",
    });
    return token;
  } catch (error) {
    return res.send(error(500, e.message));
  }
}

const logoutController = async (req, res) => {
  try {
    res.clear("jwt", {
      httpOnly: true,
      secure: true,
    });
    res.send(success(200, "User Logout"));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

module.exports = {
  signupController,
  loginController,
  refreshController,
  logoutController,
};
