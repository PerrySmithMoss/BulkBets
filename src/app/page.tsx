import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  return (
    <div className="grid w-full md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
      <div className="hidden border-r md:block">
        <div className="flex flex-col gap-3">
          <Card className="pt-5 mx-2 mt-3 bg-background">
            <CardContent className="pb-5 px-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">Live betting</p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">2024 NEW YORK PRO</p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">FIT XPO 2024 Manchester</p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">NABBA Wales 2024</p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">2024 DETROIT PRO</p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">
                    Pure Elite Manchester 2024
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm font-bold">PCA Universe Pro/Am</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mx-2 bg-background">
            <CardHeader className="px-4 pb-4">
              <CardTitle className="text-base">Time filters</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center px-1 pb-4 justify-evenly">
              <Toggle aria-label="Toggle italic">TODAY</Toggle>
              <Toggle aria-label="Toggle italic">24H</Toggle>
              <Toggle aria-label="Toggle italic">3D</Toggle>
              <Toggle aria-label="Toggle italic">1WK</Toggle>
              <Toggle aria-label="Toggle italic">ALL</Toggle>
            </CardContent>
          </Card>
          <Card className="mx-2 bg-background">
            <CardContent className="px-4 py-3">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Bodybuilding
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Classic Physique
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It comes with default styles that matches the other
                    components&apos; aesthetic.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Men&apos;s Physique
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Figure
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Fitness
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Wellness
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Bikini
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Female Bodybuilding
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Masters
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b-0">
                  <AccordionTrigger className="py-2 text-muted-foreground font-normal">
                    Wheelchair
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Inventory</h1>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              You have no products
            </h3>
            <p className="text-sm text-muted-foreground">
              You can start selling as soon as you add a product.
            </p>
            <Button className="mt-4">Add Product</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
