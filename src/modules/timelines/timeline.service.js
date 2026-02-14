import Timeline from "./timeline.model.js";

class TimelineService {
  async createTimeline(data) {
    const timeline = new Timeline(data);
    return await timeline.save();
  }
}

export default new TimelineService();
