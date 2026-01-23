/**
 * Service cho Request operations
 */
class RequestService {
  async createRequest(userId, requestData, files) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error("User không tồn tại");

    const {
      type,
      latitude,
      longitude,
      description,
      peopleCount,
      requestSupply,
    } = requestData;

    const newRequest = await requestRepository.createRequest({
      userName: user.fullName,
      type,
      latitude,
      longitude,
      description,
      peopleCount: peopleCount || 1,
      requestSupply: requestSupply || null,
    });

    const uploadedFiles = [];

    if (files.length > 0) {
      for (const file of files) {
        const media = await uploadFileForUser({
          userId,
          scope: "requests",
          refId: newRequest.id,
          file,
        });

        uploadedFiles.push({
          requestId: newRequest.id,
          ...media,
        });
      }

      await requestRepository.createRequestMedia(uploadedFiles);
    }

    return {
      message: "Tạo request thành công",
      data: {
        ...newRequest,
        media: uploadedFiles,
      },
    };
  }
}

const requestService = new RequestService();

export { requestService };