import { requestService } from "./request.service.js";
/**
 * Controller cho Request
 */
export const addRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files || [];

    const result = await requestService.createRequest(
      userId,
      req.body,
      files
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};