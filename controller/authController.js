const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/user');
const RescueTeam = require('../model/teamRescue');
const TeamMember = require('../model/TeamMember');
const RequestMission = require('../model/request');

exports.register = async (req, res) => {
  const {  fullName,email, password, role, phoneNumber } = req.body;
 

  try {
    let user = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (user) {
      if (user.email === email) {
        return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
      if (user.phoneNumber === phoneNumber) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
      }
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      fullName: fullName,
      email : email,
      password: hashedPassword,
      role:   role || "Citizen", //select role, if not provided, default to "Citizen"
      phoneNumber: phoneNumber
    });

    await user.save();

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;
  console.log(`Login attempt with password: ${password}`); 
  try {
    const user = await User.findOne({ phoneNumber: phoneNumber });
    if (!user) {
      return res.status(400).json({ message: 'Tên người dùng hoặc mật khẩu không đúng' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Tên người dùng hoặc mật khẩu không đúng' });
    }

    const payload = {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
    console.log(`User found: ${user.fullName}, Role: ${user.role}`); 
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, message: 'Đăng nhập thành công' , role: user.role});
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
//tao team cứu hộ
exports.createRescueTeam = async (req, res) => {
 const {  name, status} = req.body;
 

  try {
    let rescueTeam = await RescueTeam.findOne({ name: req.body.name });
    if (rescueTeam) {
      if (rescueTeam.name === name) {
        return res.status(400).json({ message: 'Đội cứu hộ với tên này đã tồn tại' });
    }
    }
    rescueTeam= new RescueTeam({
      name: name,
      status: status || 'Active'
    });

    await rescueTeam.save();

    res.status(201).json({ message: 'Tạo đội cứu hộ thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
    
};
// Thêm thành viên vào đội cứu hộ
exports.addMemberTeam = async (req, res) => {
  try {
    const { memberName, teamName, memberRole } = req.body;

    // 1. check user tồn tại
    const user = await User.findOne({ fullName: memberName });
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // 2. check team tồn tại
    const team = await RescueTeam.findOne({ name: teamName });
    if (!team) {
      return res.status(404).json({ message: 'Rescue team không tồn tại' });
    }

    // 3. check user đã thuộc team chưa
    const exists = await TeamMember.findOne({
      userName: user.fullName,
      rescueTeamName: team.name
    });

    if (exists) {
      return res.status(400).json({
        message: 'User đã là thành viên của team này'
      });
    }

    // 4. add member
    const member = await TeamMember.create({
      userName: user.fullName,
      rescueTeamName: team.name,
      roleTeam: memberRole || 'Member'
    });

    return res.status(201).json({
      message: 'Thêm thành viên thành công',
      data: member
    });

  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message
    });
  }
};

exports.addRequest = async (req, res) => {
  try {
    const { type, latitude, longitude, description, requestSupply, requestMedia } = req.body;

    // 1. lấy user từ token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // 2. add request
    const request = await RequestMission.create({
      userName: user.fullName,
      type,
      latitude,
      longitude,
      description,
      requestSupply: requestSupply || null,
      requestMedia: requestMedia || null
    });

    return res.status(201).json({
      message: 'Thêm yêu cầu cứu hộ/cứu trợ thành công',
      data: request
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Lỗi server',
      error: error.message
    });
  }
};
