
// garminService.js - JavaScript service for Garmin integration
import axios from 'axios';

class GarminService {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.authToken = localStorage.getItem('garmin_auth_token');
  }

  async authenticate(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/api/garmin/auth`, {
        email,
        password
      });

      if (response.data.success) {
        this.authToken = response.data.token;
        localStorage.setItem('garmin_auth_token', this.authToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Garmin authentication failed:', error);
      return false;
    }
  }

  async getRecentActivities(days = 7) {
    try {
      const response = await axios.get(`${this.baseURL}/api/garmin/activities`, {
        params: { days },
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      return response.data.activities || [];
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  }

  async getActivityDetails(activityId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/garmin/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      return response.data.details || {};
    } catch (error) {
      console.error('Failed to fetch activity details:', error);
      return {};
    }
  }

  async syncWithTrainingPlan(trainingSessions) {
    try {
      const response = await axios.post(`${this.baseURL}/api/garmin/sync`, {
        sessions: trainingSessions
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      return response.data.updatedSessions || trainingSessions;
    } catch (error) {
      console.error('Failed to sync with training plan:', error);
      return trainingSessions;
    }
  }
}

export default new GarminService();
