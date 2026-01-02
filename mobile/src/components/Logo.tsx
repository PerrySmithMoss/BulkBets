import { Image } from "react-native";

export function Logo() {
  return (
    <Image
      source={require("../../assets/logo-transparent.png")}
      style={{ width: 80, height: 35, resizeMode: "contain" }}
    />
  );
}
