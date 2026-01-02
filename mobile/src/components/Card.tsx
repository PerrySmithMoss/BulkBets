import { Text, StyleSheet, TouchableOpacity } from "react-native";

type CardProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
};

export default function Card({ title, subtitle, onPress }: CardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#212121",
    borderRadius: 12,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Android shadow
  },
  title: {
    color: "#F5C542",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#EAEAEA",
    fontSize: 14,
    textAlign: "center",
  },
});
