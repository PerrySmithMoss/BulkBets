import { useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
  createAnimatedComponent,
} from "react-native-reanimated";

import { MainTabParamList, RootStackParamList } from "../navigation/types";
import Carousel from "../components/Carousel";
import Card from "../components/Card";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

// dummy data
const carouselEvents = Array.from({ length: 10 }).map((_, i) => ({
  title: `Event #${i + 1}`,
  subtitle: "Bodybuilding Show",
}));

const divisions = [
  { id: "1", name: "Men's Open" },
  { id: "2", name: "Men's 212" },
  { id: "3", name: "Classic Physique" },
  { id: "4", name: "Women's Physique" },
  { id: "5", name: "Figure" },
];

const events = Array.from({ length: 5 }).map((_, i) =>
  Array.from({ length: 5 }).map((__, j) => ({
    id: i,
    title: `Event ${j + 1} - Division ${i + 1}`,
    subtitle: divisions[i].name,
  }))
);

const TAB_HEIGHT = 44;

const AnimatedText = createAnimatedComponent(Text);

export default function HomeScreen({}: Props) {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const sectionPositions = useRef<number[]>(Array(divisions.length).fill(0));
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);

  const scrollY = useSharedValue(0);
  const activeIndex = useSharedValue(0);
  const tabY = useSharedValue(0);
  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(0);

  const headerHeight = useHeaderHeight();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;

      for (let i = sectionPositions.current.length - 1; i >= 0; i--) {
        if (scrollY.value >= sectionPositions.current[i] - 80) {
          // update active tab
          activeIndex.value = i;
          break;
        }
      }
    },
  });

  const scrollToSection = (index: number) => {
    const y = sectionPositions.current[index];
    if (y === undefined) return;

    const layout = tabLayouts.current[index];
    if (layout) {
      underlineX.value = withTiming(layout.x, { duration: 200 });
      underlineWidth.value = withTiming(layout.width, { duration: 200 });
    }

    scrollRef.current?.scrollTo({
      y: y - TAB_HEIGHT, // subtract the sticky tabs height
      animated: true,
    });
  };

  const stickyStyle = useAnimatedStyle(() => {
    const offset = Math.max(scrollY.value - tabY.value, 0) - 5;
    return {
      transform: [{ translateY: offset }],
      zIndex: offset > 0 ? 100 : 0,
    };
  });

  const underlineStyle = useAnimatedStyle(() => ({
    width: underlineWidth.value,
    transform: [{ translateX: underlineX.value }],
  }));

  const AnimatedTab = ({ label, index }: { label: string; index: number }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      color: activeIndex.value === index ? "#F5C542" : "#9CA3AF",
    }));

    return (
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => scrollToSection(index)}
        onLayout={(e) => {
          const { x, width } = e.nativeEvent.layout;
          tabLayouts.current[index] = { x, width };

          if (index === 0 && underlineWidth.value === 0) {
            underlineX.value = x;
            underlineWidth.value = width;
          }
        }}
      >
        <AnimatedText style={[styles.tabText, animatedStyle]}>
          {label}
        </AnimatedText>
      </TouchableOpacity>
    );
  };

  const Tabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabContainer}
    >
      <Animated.View style={[styles.underline, underlineStyle]} />
      {divisions.map((div, index) => (
        <AnimatedTab key={div.id} label={div.name} index={index} />
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0F1115" }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={{ height: 100, paddingHorizontal: 8, paddingTop: 10 }}>
          <Carousel
            data={carouselEvents}
            renderItem={(item) => (
              <Card
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => alert(`Selected ${item.title}`)}
              />
            )}
          />
        </View>

        <Animated.View
          onLayout={(e) => (tabY.value = e.nativeEvent.layout.y)}
          style={[stickyStyle]}
        >
          <Tabs />
        </Animated.View>

        {events.map((divisionEvents, index) => (
          <View
            key={divisions[index].id}
            onLayout={(e) => {
              sectionPositions.current[index] = e.nativeEvent.layout.y;
            }}
            style={styles.sectionContainer}
          >
            <Text style={styles.sectionTitle}>{divisions[index].name}</Text>
            <View style={{ gap: 12 }}>
              {divisionEvents.map((event, i) => (
                <Card
                  key={i}
                  title={event.title}
                  subtitle={event.subtitle}
                  onPress={() => alert(`Selected ${event.title}`)}
                />
              ))}
            </View>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1115",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tabButton: {
    paddingHorizontal: 16,
    height: TAB_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tabText: {
    fontSize: 14,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: "#F5C542",
    borderRadius: 2,
  },
  sectionContainer: { paddingHorizontal: 8 },
  sectionTitle: {
    paddingTop: 15,
    color: "#F5C542",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
});
