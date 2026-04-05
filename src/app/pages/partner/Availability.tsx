import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { fetchPartnerAvailability, savePartnerAvailability, WeeklyAvailability } from '../../api/marketplaceApi';
import { getPartnerId } from '../../utils/session';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export function Availability() {
  const [availability, setAvailability] = useState<WeeklyAvailability>({});
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    fetchPartnerAvailability(getPartnerId())
      .then((response) => {
        if (active) {
          setAvailability(response);
        }
      })
      .catch(() => {
        toast.error('Unable to load availability.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDayToggle = (day: string) => {
    setAvailability((previous) => ({
      ...previous,
      [day]: {
        ...(previous[day] || { enabled: false, slots: [] }),
        enabled: !(previous[day]?.enabled || false),
      },
    }));
  };

  const handleSlotToggle = (day: string, slot: string) => {
    setAvailability((previous) => {
      const dayValue = previous[day] || { enabled: true, slots: [] };
      const newSlots = dayValue.slots.includes(slot)
        ? dayValue.slots.filter((candidate) => candidate !== slot)
        : [...dayValue.slots, slot].sort();

      return {
        ...previous,
        [day]: { ...dayValue, slots: newSlots, enabled: true },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await savePartnerAvailability(getPartnerId(), availability);
      setAvailability(response);
      toast.success('Availability saved successfully.');
    } catch {
      toast.error('Unable to save availability.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading availability...</div>;
  }

  const currentDay = availability[selectedDay] || { enabled: false, slots: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="text-sm text-white/80 mt-1">Manage your working hours</p>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Working Days
          </h2>
          <div className="space-y-3">
            {weekDays.map((day) => {
              const dayData = availability[day] || { enabled: false, slots: [] };
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedDay === day ? 'border-primary bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dayData.enabled}
                      onCheckedChange={() => handleDayToggle(day)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <div>
                      <p className="font-medium">{day}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayData.enabled ? `${dayData.slots.length} slots` : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                  {dayData.enabled && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Time Slots for {selectedDay}
            </h2>
            <Badge variant={currentDay.enabled ? 'default' : 'secondary'}>{currentDay.slots.length} selected</Badge>
          </div>

          {currentDay.enabled ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">Select available slots for {selectedDay}</p>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => {
                  const isSelected = currentDay.slots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => handleSlotToggle(selectedDay, slot)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-primary to-accent text-white'
                          : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-primary/20 hover:border-primary'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-muted-foreground mb-2">{selectedDay} is disabled</h3>
              <p className="text-sm text-muted-foreground mb-4">Enable {selectedDay} to set time slots</p>
              <Button onClick={() => handleDayToggle(selectedDay)} variant="outline">
                Enable {selectedDay}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={() => void handleSave()} disabled={saving} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
