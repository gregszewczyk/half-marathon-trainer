
import json
import datetime
from typing import Dict, List, Optional
from garminconnect import Garmin

class GarminTrainingIntegration:
    def __init__(self, email: str, password: str):
        """Initialize Garmin connection with user credentials"""
        self.email = email
        self.password = password
        self.client = None
        self.authenticated = False

    def authenticate(self) -> bool:
        """Authenticate with Garmin Connect"""
        try:
            self.client = Garmin(self.email, self.password)
            self.client.login()
            self.authenticated = True
            print("✅ Successfully authenticated with Garmin Connect")
            return True
        except Exception as e:
            print(f"❌ Authentication failed: {str(e)}")
            self.authenticated = False
            return False

    def get_recent_activities(self, days: int = 7) -> List[Dict]:
        """Fetch recent activities from Garmin Connect"""
        if not self.authenticated:
            if not self.authenticate():
                return []

        try:
            # Get activities from the last X days
            activities = self.client.get_activities(0, days * 2)  # Fetch extra to account for rest days

            # Filter for running activities and parse relevant data
            running_activities = []
            for activity in activities:
                if activity.get('activityType', {}).get('typeKey') == 'running':
                    parsed_activity = self._parse_activity(activity)
                    running_activities.append(parsed_activity)

            return running_activities
        except Exception as e:
            print(f"❌ Failed to fetch activities: {str(e)}")
            return []

    def get_activity_details(self, activity_id: str) -> Dict:
        """Get detailed metrics for a specific activity"""
        if not self.authenticated:
            if not self.authenticate():
                return {}

        try:
            details = self.client.get_activity_details(activity_id)
            return self._parse_detailed_activity(details)
        except Exception as e:
            print(f"❌ Failed to fetch activity details: {str(e)}")
            return {}

    def _parse_activity(self, activity: Dict) -> Dict:
        """Parse basic activity data into training app format"""
        return {
            'id': activity.get('activityId'),
            'name': activity.get('activityName', ''),
            'date': activity.get('startTimeLocal', ''),
            'distance_km': round(activity.get('distance', 0) / 1000, 2),
            'duration_seconds': activity.get('duration', 0),
            'duration_formatted': self._format_duration(activity.get('duration', 0)),
            'average_pace_per_km': self._calculate_pace(activity.get('distance', 0), activity.get('duration', 0)),
            'avg_heart_rate': activity.get('averageHR'),
            'max_heart_rate': activity.get('maxHR'),
            'calories': activity.get('calories', 0),
            'elevation_gain': activity.get('elevationGain', 0),
            'activity_type': activity.get('activityType', {}).get('typeKey', ''),
            'garmin_data': activity  # Store raw data for advanced processing
        }

    def _parse_detailed_activity(self, details: Dict) -> Dict:
        """Parse detailed activity data with splits and heart rate zones"""
        return {
            'splits': details.get('splits', []),
            'heart_rate_zones': details.get('heartRateZones', []),
            'time_in_zones': details.get('timeInZones', {}),
            'lap_data': details.get('laps', []),
            'gps_data': details.get('geoPoints', []),
            'advanced_metrics': {
                'training_stress_score': details.get('trainingStressScore'),
                'training_effect': details.get('trainingEffect'),
                'recovery_time': details.get('recoveryTime'),
                'vo2_max': details.get('vO2MaxValue')
            }
        }

    def _calculate_pace(self, distance_m: float, duration_s: float) -> str:
        """Calculate pace in min/km format"""
        if distance_m == 0 or duration_s == 0:
            return "0:00"

        pace_seconds_per_km = (duration_s / (distance_m / 1000))
        minutes = int(pace_seconds_per_km // 60)
        seconds = int(pace_seconds_per_km % 60)
        return f"{minutes}:{seconds:02d}"

    def _format_duration(self, duration_seconds: int) -> str:
        """Format duration as HH:MM:SS"""
        hours = duration_seconds // 3600
        minutes = (duration_seconds % 3600) // 60
        seconds = duration_seconds % 60

        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes}:{seconds:02d}"

    def sync_with_training_plan(self, training_sessions: List[Dict]) -> List[Dict]:
        """Match Garmin activities with planned training sessions"""
        recent_activities = self.get_recent_activities(7)

        for session in training_sessions:
            if session.get('type') == 'running' and session.get('status') == 'planned':
                # Try to match with Garmin activity by date
                session_date = session.get('scheduled_date')
                matching_activity = self._find_matching_activity(recent_activities, session_date)

                if matching_activity:
                    session.update({
                        'status': 'completed',
                        'actual_distance': matching_activity['distance_km'],
                        'actual_duration': matching_activity['duration_formatted'],
                        'actual_pace': matching_activity['average_pace_per_km'],
                        'avg_heart_rate': matching_activity['avg_heart_rate'],
                        'max_heart_rate': matching_activity['max_heart_rate'],
                        'calories_burned': matching_activity['calories'],
                        'garmin_activity_id': matching_activity['id'],
                        'sync_timestamp': datetime.datetime.now().isoformat()
                    })

        return training_sessions

    def _find_matching_activity(self, activities: List[Dict], target_date: str) -> Optional[Dict]:
        """Find activity that matches the planned session date"""
        for activity in activities:
            activity_date = activity['date'][:10]  # Extract YYYY-MM-DD
            if activity_date == target_date:
                return activity
        return None

    def generate_ai_feedback(self, session: Dict) -> Dict:
        """Generate AI feedback based on Garmin data vs planned targets"""
        feedback = {
            'performance_analysis': {},
            'recommendations': [],
            'adaptations': {}
        }

        if session.get('actual_pace') and session.get('target_pace'):
            actual_pace_seconds = self._pace_to_seconds(session['actual_pace'])
            target_pace_seconds = self._pace_to_seconds(session['target_pace'])

            pace_difference = actual_pace_seconds - target_pace_seconds

            if pace_difference < -15:  # More than 15 seconds faster
                feedback['performance_analysis']['pace'] = 'significantly_faster'
                feedback['recommendations'].append('Consider increasing goal pace for future sessions')
                feedback['adaptations']['increase_intensity'] = True
            elif pace_difference < -5:  # 5-15 seconds faster
                feedback['performance_analysis']['pace'] = 'faster'
                feedback['recommendations'].append('Good pacing - maintaining current intensity')
            elif pace_difference > 15:  # More than 15 seconds slower
                feedback['performance_analysis']['pace'] = 'significantly_slower'
                feedback['recommendations'].append('Consider reducing intensity or adding recovery')
                feedback['adaptations']['decrease_intensity'] = True
            else:
                feedback['performance_analysis']['pace'] = 'on_target'
                feedback['recommendations'].append('Perfect pacing - continue as planned')

        # Heart rate analysis
        if session.get('avg_heart_rate'):
            hr_zones = self._analyze_heart_rate_zones(session['avg_heart_rate'])
            feedback['performance_analysis']['heart_rate'] = hr_zones

        return feedback

    def _pace_to_seconds(self, pace_str: str) -> int:
        """Convert pace string (MM:SS) to seconds per km"""
        try:
            minutes, seconds = pace_str.split(':')
            return int(minutes) * 60 + int(seconds)
        except:
            return 0

    def _analyze_heart_rate_zones(self, avg_hr: int) -> str:
        """Analyze heart rate zones (simplified - should be personalized)"""
        # These should be calculated based on user's max HR
        if avg_hr < 140:
            return 'easy_aerobic'
        elif avg_hr < 160:
            return 'moderate_aerobic'
        elif avg_hr < 175:
            return 'threshold'
        else:
            return 'anaerobic'

# Example usage and integration
def main():
    # Initialize Garmin connection
    garmin = GarminTrainingIntegration("your_email@gmail.com", "your_password")

    # Example training session data structure
    training_sessions = [
        {
            'id': 'session_1',
            'type': 'running',
            'session_type': 'easy',
            'scheduled_date': '2025-07-15',
            'target_distance': 5.0,
            'target_pace': '6:30',
            'status': 'planned'
        },
        {
            'id': 'session_2',
            'type': 'running',
            'session_type': 'tempo',
            'scheduled_date': '2025-07-17',
            'target_distance': 8.0,
            'target_pace': '5:30',
            'status': 'planned'
        }
    ]

    # Sync with Garmin data
    updated_sessions = garmin.sync_with_training_plan(training_sessions)

    # Generate AI feedback for completed sessions
    for session in updated_sessions:
        if session.get('status') == 'completed':
            feedback = garmin.generate_ai_feedback(session)
            session['ai_feedback'] = feedback

    return updated_sessions

if __name__ == "__main__":
    main()
