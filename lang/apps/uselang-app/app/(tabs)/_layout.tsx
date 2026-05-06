import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/lib/theme-context";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type TabConfig = {
  name: string;
  title: string;
  icon: IoniconName;
  iconActive: IoniconName;
};

// Design tokens matching the home screen
const AMBER      = "#A85D2E";
const MUTED      = "#8C827A";
const PAPER_TINT = "#F3EDE3";

const VISIBLE_TABS: TabConfig[] = [
  { name: "index",    title: "Today",    icon: "sunny-outline",  iconActive: "sunny" },
  { name: "train",    title: "Speak",    icon: "mic-outline",    iconActive: "mic" },
  { name: "globe",    title: "Map",      icon: "earth-outline",  iconActive: "earth" },
  { name: "lessons",  title: "Learn",    icon: "book-outline",   iconActive: "book" },
  { name: "settings", title: "Settings", icon: "settings-outline", iconActive: "settings" },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const isDark = theme.isDark;
  const tabBg = isDark ? theme.card : PAPER_TINT;
  const tabBorder = isDark ? theme.border : "rgba(17,16,16,0.08)";
  const activeColor = isDark ? theme.accent : AMBER;
  const inactiveColor = isDark ? theme.muted : MUTED;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: "absolute",
          left: 20,
          right: 20,
          bottom: insets.bottom + 10,
          height: 68,
          borderRadius: 26,
          backgroundColor: Platform.OS === "ios" ? "transparent" : tabBg,
          borderTopWidth: 0,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.3 : 0.14,
          shadowRadius: 24,
          elevation: 20,
          borderWidth: 0.5,
          borderColor: tabBorder,
          paddingTop: 4,
          paddingBottom: 4,
          overflow: "visible",
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 2,
          height: 60,
          overflow: "visible",
        },
        tabBarLabelStyle: {
          fontFamily: "Geist-Medium",
          fontSize: 10,
          letterSpacing: 0.2,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint={isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
              intensity={80}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 26,
                  overflow: "hidden",
                  backgroundColor: isDark ? "rgba(20,20,30,0.70)" : "rgba(243,237,227,0.55)",
                },
              ]}
            />
          ) : null,
      }}
    >
      {VISIBLE_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 50,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: focused ? (isDark ? theme.accentSoft : "rgba(168,93,46,0.12)") : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={focused ? tab.iconActive : tab.icon}
                  size={21}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}

      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}
