import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EventItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  type: "Event" | "Competition" | "Reminder";
  description: string;
};

type ResourceItem = {
  id: string;
  title: string;
  category: "Guide" | "Document" | "Form" | "Competition Prep";
  description: string;
  updatedAt: string;
};

const initialEvents: EventItem[] = [
  {
    id: "1",
    title: "Chapter Meeting",
    date: "2026-04-08",
    time: "3:30 PM",
    location: "Business Lab Room 201",
    type: "Event",
    description: "Weekly FBLA chapter meeting with officer updates and announcements.",
  },
  {
    id: "2",
    title: "State Leadership Registration Deadline",
    date: "2026-04-11",
    time: "11:59 PM",
    location: "Online Submission",
    type: "Reminder",
    description: "Final day to register for the State Leadership Conference.",
  },
  {
    id: "3",
    title: "Public Speaking Practice",
    date: "2026-04-15",
    time: "4:15 PM",
    location: "Auditorium",
    type: "Competition",
    description: "Mock presentation session for competitive event preparation.",
  },
  {
    id: "4",
    title: "Networking Workshop",
    date: "2026-04-19",
    time: "2:00 PM",
    location: "Media Center",
    type: "Event",
    description: "Interactive workshop on networking and professional communication.",
  },
];

const initialResources: ResourceItem[] = [
  {
    id: "r1",
    title: "FBLA Competition Guidelines",
    category: "Guide",
    description: "Overview of event rules, scoring criteria, and preparation tips.",
    updatedAt: "2026-04-01",
  },
  {
    id: "r2",
    title: "Membership Handbook",
    category: "Document",
    description: "Everything members need to know about participation, dress code, and leadership.",
    updatedAt: "2026-03-27",
  },
  {
    id: "r3",
    title: "Conference Permission Form",
    category: "Form",
    description: "Sample form students can use for conference attendance approval.",
    updatedAt: "2026-03-30",
  },
  {
    id: "r4",
    title: "Interview Event Prep Sheet",
    category: "Competition Prep",
    description: "Common interview questions and answer structure examples.",
    updatedAt: "2026-04-03",
  },
];

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const formatDayName = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDaysInMonth = (year: number, month: number) => {
  const days: Date[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= lastDay; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

const typeStyles: Record<EventItem["type"], string> = {
  Event: "bg-blue-100 text-blue-700",
  Competition: "bg-purple-100 text-purple-700",
  Reminder: "bg-amber-100 text-amber-700",
};

const resourceStyles: Record<ResourceItem["category"], string> = {
  Guide: "bg-emerald-100 text-emerald-700",
  Document: "bg-slate-200 text-slate-700",
  Form: "bg-pink-100 text-pink-700",
  "Competition Prep": "bg-indigo-100 text-indigo-700",
};

export default function CalendarResourcesTab() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);

  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState<EventItem>({
    id: "",
    title: "",
    date: toDateKey(today),
    time: "",
    location: "",
    type: "Event",
    description: "",
  });

  const [resourceForm, setResourceForm] = useState<ResourceItem>({
    id: "",
    title: "",
    category: "Guide",
    description: "",
    updatedAt: toDateKey(today),
  });

  const days = useMemo(() => {
    return getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  const selectedEvents = useMemo(() => {
    return events
      .filter((event) => event.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedDate]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 4);
  }, [events]);

  const monthEventDates = useMemo(() => {
    return new Set(
      events
        .filter((event) => {
          const eventDate = new Date(event.date + "T00:00:00");
          return (
            eventDate.getMonth() === currentMonth.getMonth() &&
            eventDate.getFullYear() === currentMonth.getFullYear()
          );
        })
        .map((event) => event.date)
    );
  }, [events, currentMonth]);

  const openAddEvent = () => {
    setEditingEventId(null);
    setEventForm({
      id: "",
      title: "",
      date: selectedDate,
      time: "",
      location: "",
      type: "Event",
      description: "",
    });
    setEventModalVisible(true);
  };

  const openEditEvent = (event: EventItem) => {
    setEditingEventId(event.id);
    setEventForm(event);
    setEventModalVisible(true);
  };

  const saveEvent = () => {
    if (!eventForm.title.trim() || !eventForm.date.trim() || !eventForm.time.trim()) return;

    if (editingEventId) {
      setEvents((prev) =>
        prev.map((item) => (item.id === editingEventId ? { ...eventForm, id: editingEventId } : item))
      );
    } else {
      setEvents((prev) => [
        { ...eventForm, id: Date.now().toString() },
        ...prev,
      ]);
    }

    setEventModalVisible(false);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((item) => item.id !== id));
  };

  const openAddResource = () => {
    setEditingResourceId(null);
    setResourceForm({
      id: "",
      title: "",
      category: "Guide",
      description: "",
      updatedAt: toDateKey(today),
    });
    setResourceModalVisible(true);
  };

  const openEditResource = (resource: ResourceItem) => {
    setEditingResourceId(resource.id);
    setResourceForm(resource);
    setResourceModalVisible(true);
  };

  const saveResource = () => {
    if (!resourceForm.title.trim() || !resourceForm.description.trim()) return;

    if (editingResourceId) {
      setResources((prev) =>
        prev.map((item) =>
          item.id === editingResourceId
            ? { ...resourceForm, id: editingResourceId }
            : item
        )
      );
    } else {
      setResources((prev) => [
        { ...resourceForm, id: Date.now().toString() },
        ...prev,
      ]);
    }

    setResourceModalVisible(false);
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
      >
        <View className="px-5 pt-4">
          <Text className="text-3xl font-bold text-slate-900">
            Calendar & Resources
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Keep members on track with events, reminders, and important chapter documents.
          </Text>
        </View>

        <View className="mx-5 mt-5 rounded-3xl bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-slate-900">
                {formatMonthYear(currentMonth)}
              </Text>
              <Text className="text-sm text-slate-500">
                Tap a day to view that day’s events
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  )
                }
                className="rounded-2xl bg-slate-100 px-4 py-2"
              >
                <Text className="font-semibold text-slate-700">Prev</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }
                className="rounded-2xl bg-slate-900 px-4 py-2"
              >
                <Text className="font-semibold text-white">Next</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            <View className="flex-row">
              {days.map((day) => {
                const dateKey = toDateKey(day);
                const isSelected = dateKey === selectedDate;
                const hasEvent = monthEventDates.has(dateKey);
                const isToday = dateKey === toDateKey(today);

                return (
                  <Pressable
                    key={dateKey}
                    onPress={() => setSelectedDate(dateKey)}
                    className={`mr-3 w-[72px] rounded-3xl border p-3 ${
                      isSelected
                        ? "border-slate-900 bg-slate-900"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isSelected ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {formatDayName(day)}
                    </Text>

                    <Text
                      className={`mt-1 text-2xl font-bold ${
                        isSelected ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {day.getDate()}
                    </Text>

                    <View className="mt-2 flex-row items-center justify-between">
                      <Text
                        className={`text-[11px] ${
                          isSelected ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {isToday ? "Today" : ""}
                      </Text>

                      {hasEvent ? (
                        <View
                          className={`h-2.5 w-2.5 rounded-full ${
                            isSelected ? "bg-white" : "bg-slate-900"
                          }`}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="mx-5 mt-5 rounded-3xl bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-slate-900">
                Events on {selectedDate}
              </Text>
              <Text className="text-sm text-slate-500">
                Manage chapter activities and reminders
              </Text>
            </View>

            <Pressable
              onPress={openAddEvent}
              className="rounded-2xl bg-slate-900 px-4 py-3"
            >
              <Text className="font-semibold text-white">Add Event</Text>
            </Pressable>
          </View>

          <View className="mt-4">
            {selectedEvents.length === 0 ? (
              <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <Text className="text-base font-semibold text-slate-800">
                  No events scheduled
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Add a meeting, deadline, competition, or reminder for this day.
                </Text>
              </View>
            ) : (
              selectedEvents.map((event) => (
                <View
                  key={event.id}
                  className="mb-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-bold text-slate-900">
                          {event.title}
                        </Text>
                        <View
                          className={`rounded-full px-3 py-1 ${typeStyles[event.type]}`}
                        >
                          <Text className="text-xs font-semibold">
                            {event.type}
                          </Text>
                        </View>
                      </View>

                      <Text className="mt-2 text-sm text-slate-600">
                        {event.time} • {event.location}
                      </Text>

                      <Text className="mt-2 text-sm leading-5 text-slate-500">
                        {event.description}
                      </Text>
                    </View>

                    <View className="gap-2">
                      <Pressable
                        onPress={() => openEditEvent(event)}
                        className="rounded-xl bg-white px-3 py-2"
                      >
                        <Text className="font-medium text-slate-700">Edit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => deleteEvent(event.id)}
                        className="rounded-xl bg-red-50 px-3 py-2"
                      >
                        <Text className="font-medium text-red-600">Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View className="mx-5 mt-5 rounded-3xl bg-white p-4 shadow-sm">
          <Text className="text-xl font-bold text-slate-900">
            Upcoming Highlights
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Quick view of the next important dates
          </Text>

          <View className="mt-4">
            {upcomingEvents.map((event) => (
              <View
                key={event.id}
                className="mb-3 flex-row items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-bold text-slate-900">
                    {event.title}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {event.date} • {event.time}
                  </Text>
                </View>

                <View className={`rounded-full px-3 py-1 ${typeStyles[event.type]}`}>
                  <Text className="text-xs font-semibold">{event.type}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="mx-5 mt-5 rounded-3xl bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-slate-900">Resources</Text>
              <Text className="text-sm text-slate-500">
                Documents, guides, prep sheets, and forms
              </Text>
            </View>

            <Pressable
              onPress={openAddResource}
              className="rounded-2xl bg-slate-900 px-4 py-3"
            >
              <Text className="font-semibold text-white">Add Resource</Text>
            </Pressable>
          </View>

          <View className="mt-4">
            {resources.map((resource) => (
              <View
                key={resource.id}
                className="mb-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lg font-bold text-slate-900">
                        {resource.title}
                      </Text>
                      <View
                        className={`rounded-full px-3 py-1 ${resourceStyles[resource.category]}`}
                      >
                        <Text className="text-xs font-semibold">
                          {resource.category}
                        </Text>
                      </View>
                    </View>

                    <Text className="mt-2 text-sm leading-5 text-slate-500">
                      {resource.description}
                    </Text>

                    <Text className="mt-2 text-xs text-slate-400">
                      Updated {resource.updatedAt}
                    </Text>
                  </View>

                  <View className="gap-2">
                    <Pressable
                      onPress={() => openEditResource(resource)}
                      className="rounded-xl bg-white px-3 py-2"
                    >
                      <Text className="font-medium text-slate-700">Edit</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => deleteResource(resource.id)}
                      className="rounded-xl bg-red-50 px-3 py-2"
                    >
                      <Text className="font-medium text-red-600">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={eventModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEventModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white p-5">
            <Text className="text-2xl font-bold text-slate-900">
              {editingEventId ? "Edit Event" : "Add Event"}
            </Text>

            <View className="mt-4 gap-3">
              <TextInput
                value={eventForm.title}
                onChangeText={(text) => setEventForm((prev) => ({ ...prev, title: text }))}
                placeholder="Event title"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={eventForm.date}
                onChangeText={(text) => setEventForm((prev) => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={eventForm.time}
                onChangeText={(text) => setEventForm((prev) => ({ ...prev, time: text }))}
                placeholder="Time"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={eventForm.location}
                onChangeText={(text) => setEventForm((prev) => ({ ...prev, location: text }))}
                placeholder="Location"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={eventForm.type}
                onChangeText={(text) =>
                  setEventForm((prev) => ({
                    ...prev,
                    type: (text as EventItem["type"]) || "Event",
                  }))
                }
                placeholder="Event / Competition / Reminder"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={eventForm.description}
                onChangeText={(text) =>
                  setEventForm((prev) => ({ ...prev, description: text }))
                }
                placeholder="Description"
                placeholderTextColor="#94a3b8"
                multiline
                className="min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                textAlignVertical="top"
              />
            </View>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setEventModalVisible(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-4"
              >
                <Text className="text-center font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={saveEvent}
                className="flex-1 rounded-2xl bg-slate-900 py-4"
              >
                <Text className="text-center font-semibold text-white">
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={resourceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResourceModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white p-5">
            <Text className="text-2xl font-bold text-slate-900">
              {editingResourceId ? "Edit Resource" : "Add Resource"}
            </Text>

            <View className="mt-4 gap-3">
              <TextInput
                value={resourceForm.title}
                onChangeText={(text) =>
                  setResourceForm((prev) => ({ ...prev, title: text }))
                }
                placeholder="Resource title"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={resourceForm.category}
                onChangeText={(text) =>
                  setResourceForm((prev) => ({
                    ...prev,
                    category: (text as ResourceItem["category"]) || "Guide",
                  }))
                }
                placeholder="Guide / Document / Form / Competition Prep"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={resourceForm.updatedAt}
                onChangeText={(text) =>
                  setResourceForm((prev) => ({ ...prev, updatedAt: text }))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />

              <TextInput
                value={resourceForm.description}
                onChangeText={(text) =>
                  setResourceForm((prev) => ({ ...prev, description: text }))
                }
                placeholder="Description"
                placeholderTextColor="#94a3b8"
                multiline
                className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                textAlignVertical="top"
              />
            </View>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setResourceModalVisible(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-4"
              >
                <Text className="text-center font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={saveResource}
                className="flex-1 rounded-2xl bg-slate-900 py-4"
              >
                <Text className="text-center font-semibold text-white">
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}