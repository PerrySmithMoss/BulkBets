import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Events">;

export default function EventsScreen({ route, navigation }: Props) {
  const { eventId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Events Screen</Text>
      <Text>Event ID: {eventId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});
