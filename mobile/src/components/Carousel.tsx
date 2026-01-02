import React from "react";
import { FlatList, View, Dimensions } from "react-native";

type CarouselProps<T> = {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  cardWidthPercentage?: number;
};

const { width: screenWidth } = Dimensions.get("window");

export default function Carousel<T>({
  data,
  renderItem,
  cardWidthPercentage = 0.88,
}: CarouselProps<T>) {
  const cardWidth = screenWidth * cardWidthPercentage;

  return (
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, index) => index.toString()}
      snapToInterval={cardWidth}
      decelerationRate="fast"
      renderItem={({ item, index }) => (
        <View
          style={{
            width: cardWidth,
            marginRight: index === data.length - 1 ? 0 : 10,
          }}
        >
          {renderItem(item, index)}
        </View>
      )}
    />
  );
}
