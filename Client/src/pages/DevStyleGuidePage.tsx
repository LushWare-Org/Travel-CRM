import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RangeFilterGroup from '@/components/shared/RangeFilterGroup';
import type { RangeOption } from '@/components/shared/RangeFilterGroup';

/* ------------------------------------------------------------------ */
/* Demo data                                                          */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
const buttonVariants: { label: string; variant: ButtonVariant }[] = [
  { label: 'Default', variant: 'default' },
  { label: 'Secondary', variant: 'secondary' },
  { label: 'Outline', variant: 'outline' },
  { label: 'Ghost', variant: 'ghost' },
  { label: 'Destructive', variant: 'destructive' },
  { label: 'Link', variant: 'link' },
];

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
const badgeVariants: { label: string; variant: BadgeVariant }[] = [
  { label: 'Default', variant: 'default' },
  { label: 'Secondary', variant: 'secondary' },
  { label: 'Destructive', variant: 'destructive' },
  { label: 'Outline', variant: 'outline' },
  { label: 'Ghost', variant: 'ghost' },
  { label: 'Link', variant: 'link' },
];

interface ColorToken {
  name: string;
  /** Literal Tailwind class (kept static so the v4 scanner emits it). */
  cls: string;
  hex: string;
}

const brandScale: ColorToken[] = [
  { name: 'brand-50', cls: 'bg-brand-50', hex: '#F0F7F3' },
  { name: 'brand-100', cls: 'bg-brand-100', hex: '#DCEEE2' },
  { name: 'brand-200', cls: 'bg-brand-200', hex: '#BADFC8' },
  { name: 'brand-300', cls: 'bg-brand-300', hex: '#8FC9A6' },
  { name: 'brand-400', cls: 'bg-brand-400', hex: '#5FAD7E' },
  { name: 'brand-500', cls: 'bg-brand-500', hex: '#3B8F5E' },
  { name: 'brand-600', cls: 'bg-brand-600', hex: '#2C7048' },
  { name: 'brand-700', cls: 'bg-brand-700', hex: '#235939' },
  { name: 'brand-800', cls: 'bg-brand-800', hex: '#1B4332' },
  { name: 'brand-900', cls: 'bg-brand-900', hex: '#123020' },
  { name: 'brand-950', cls: 'bg-brand-950', hex: '#0A1F14' },
];

const brandDarkScale: ColorToken[] = [
  { name: 'brand-dark-800', cls: 'bg-brand-dark-800', hex: '#16261E' },
  { name: 'brand-dark-900', cls: 'bg-brand-dark-900', hex: '#0D1712' },
  { name: 'brand-dark-950', cls: 'bg-brand-dark-950', hex: '#060B08' },
];

const brandAccentScale: ColorToken[] = [
  { name: 'brand-accent-50', cls: 'bg-brand-accent-50', hex: '#FBF6EC' },
  { name: 'brand-accent-100', cls: 'bg-brand-accent-100', hex: '#F6EAD1' },
  { name: 'brand-accent-200', cls: 'bg-brand-accent-200', hex: '#ECD5A3' },
  { name: 'brand-accent-300', cls: 'bg-brand-accent-300', hex: '#E0BC72' },
  { name: 'brand-accent-400', cls: 'bg-brand-accent-400', hex: '#D4AD5A' },
  { name: 'brand-accent-500', cls: 'bg-brand-accent-500', hex: '#C9A24B' },
  { name: 'brand-accent-600', cls: 'bg-brand-accent-600', hex: '#AD8536' },
  { name: 'brand-accent-700', cls: 'bg-brand-accent-700', hex: '#8C6A2B' },
  { name: 'brand-accent-800', cls: 'bg-brand-accent-800', hex: '#6E5322' },
  { name: 'brand-accent-900', cls: 'bg-brand-accent-900', hex: '#574218' },
  { name: 'brand-accent-950', cls: 'bg-brand-accent-950', hex: '#332610' },
];

const grayScale: ColorToken[] = [
  { name: 'gray-50', cls: 'bg-gray-50', hex: '#FAF8F4' },
  { name: 'gray-100', cls: 'bg-gray-100', hex: '#F3EFE6' },
  { name: 'gray-200', cls: 'bg-gray-200', hex: '#E7E0D2' },
  { name: 'gray-300', cls: 'bg-gray-300', hex: '#D6CBB5' },
  { name: 'gray-400', cls: 'bg-gray-400', hex: '#B9AA8C' },
  { name: 'gray-500', cls: 'bg-gray-500', hex: '#9C8B6C' },
  { name: 'gray-600', cls: 'bg-gray-600', hex: '#7C6E56' },
  { name: 'gray-700', cls: 'bg-gray-700', hex: '#5F5341' },
  { name: 'gray-800', cls: 'bg-gray-800', hex: '#443A2E' },
  { name: 'gray-900', cls: 'bg-gray-900', hex: '#2B241C' },
  { name: 'gray-950', cls: 'bg-gray-950', hex: '#1A1610' },
];

const durationOptions: RangeOption[] = [
  { label: 'Under 1 week', min: 0, max: 6 },
  { label: '1-2 weeks', min: 7, max: 14 },
  { label: '2-4 weeks', min: 15, max: 28 },
  { label: 'Over a month', min: 29, max: 365 },
];

const zIndexTokens: { name: string; value: number; tier: string }[] = [
  { name: 'z-base', value: 0, tier: 'Local (decorative)' },
  { name: 'z-raised', value: 10, tier: 'Local (decorative)' },
  { name: 'z-elevated', value: 20, tier: 'Local (decorative)' },
  { name: 'z-lifted', value: 30, tier: 'Local (decorative)' },
  { name: 'z-prominent', value: 40, tier: 'Local (decorative)' },
  { name: 'z-header', value: 50, tier: 'Global (app chrome)' },
  { name: 'z-dropdown', value: 60, tier: 'Global (app chrome)' },
  { name: 'z-floating-action', value: 70, tier: 'Global (app chrome)' },
  { name: 'z-overlay', value: 90, tier: 'Global (app chrome)' },
  { name: 'z-modal', value: 100, tier: 'Global (app chrome)' },
];

const typeScaleSamples: { token: string; className: string; meta: string }[] = [
  { token: 'text-hero', className: 'text-hero font-display', meta: '4.75rem / 600 / -0.02em' },
  { token: 'text-display-lg', className: 'text-display-lg font-display', meta: '3rem / 1.1' },
  { token: 'text-display-md', className: 'text-display-md font-display', meta: '2.25rem / 1.18' },
  { token: 'text-2xl', className: 'text-2xl', meta: '1.5rem' },
  { token: 'text-lg', className: 'text-lg', meta: '1.125rem' },
  { token: 'text-base', className: 'text-base', meta: '1rem' },
  { token: 'text-sm', className: 'text-sm', meta: '0.875rem' },
];

const SAMPLE_COPY = 'Tailor-made travel starts here';

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-display-md font-display text-gray-900">{children}</h2>;
}

function Swatch({ token }: { token: ColorToken }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-14 w-24 rounded-md border border-black/5 ${token.cls}`} />
      <p className="font-mono text-[11px] text-gray-700">{token.name}</p>
      <p className="font-mono text-[11px] text-gray-400">{token.hex}</p>
    </div>
  );
}

function ColorScale({ title, tokens }: { title: string; tokens: ColorToken[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg text-gray-900">{title}</h3>
      <div className="flex flex-wrap gap-x-5 gap-y-5 rounded-lg border border-gray-200 bg-white p-5">
        {tokens.map((token) => (
          <Swatch key={token.name} token={token} />
        ))}
      </div>
    </section>
  );
}

function TypeSample({ token, className, meta }: { token: string; className: string; meta: string }) {
  return (
    <div className="flex items-baseline gap-6">
      <div className="w-44 shrink-0">
        <code className="text-xs text-gray-500">{token}</code>
        <p className="text-[11px] text-gray-400">{meta}</p>
      </div>
      <p className={`min-w-0 flex-1 text-gray-900 ${className}`}>{SAMPLE_COPY}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DevStyleGuidePage() {
  const [selectedDuration, setSelectedDuration] = useState<RangeOption | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-5xl space-y-14 px-4 py-10 sm:px-6">
        {/* Page header */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-display-lg font-display text-gray-900">Phase 0 Style Guide</h1>
            <Badge variant="secondary">dev-only</Badge>
          </div>
          <p className="max-w-2xl text-gray-600">
            Development-only verification page &mdash; removed from production builds. Compare
            primitives, tokens, and the RangeFilterGroup component against DESIGN.md.
          </p>
        </header>

        {/* Buttons */}
        <section className="space-y-4">
          <SectionHeading>Buttons</SectionHeading>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-5 rounded-lg border border-gray-200 bg-white p-6">
            {buttonVariants.map(({ label, variant }) => (
              <div key={variant} className="flex flex-col items-center gap-2">
                <Button variant={variant}>{label}</Button>
                <span className="font-mono text-[11px] text-gray-400">{variant}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <SectionHeading>Badges</SectionHeading>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-5 rounded-lg border border-gray-200 bg-white p-6">
            {badgeVariants.map(({ label, variant }) => (
              <div key={variant} className="flex flex-col items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span className="font-mono text-[11px] text-gray-400">{variant}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Card */}
        <section className="space-y-4">
          <SectionHeading>Card</SectionHeading>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Paris Highlights</CardTitle>
              <CardDescription>4 days in the city of light, hand-arranged.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Louvre mornings, Marais evenings, and a Seine cruise at dusk &mdash; with a local
                guide on call the whole trip.
              </p>
              <Button className="mt-4">View details</Button>
            </CardContent>
          </Card>
        </section>

        {/* Inputs */}
        <section className="space-y-6">
          <SectionHeading>Inputs</SectionHeading>

          <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 md:grid-cols-2">
            {/* Input */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Input</h3>
              <Input placeholder="e.g. Santorini, Greece" />
            </div>

            {/* Select */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Select</h3>
              <Select defaultValue="Asia">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Anywhere">Anywhere</SelectItem>
                  <SelectItem value="Africa">Africa</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="South America">South America</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox */}
            <div className="flex flex-col gap-3 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900">Checkbox</h3>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                <Checkbox aria-label="Unchecked by default" />
                Unchecked
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                <Checkbox aria-label="Checked by default" defaultChecked />
                Checked by default
              </label>
              <label className="flex cursor-not-allowed items-center gap-2.5 text-sm text-gray-400">
                <Checkbox aria-label="Disabled checkbox" disabled defaultChecked />
                Disabled (checked)
              </label>
            </div>
          </div>
        </section>

        {/* Overlays */}
        <section className="space-y-6">
          <SectionHeading>Overlays</SectionHeading>
          <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 md:grid-cols-2">
            <div className="flex flex-col items-start gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Dialog</h3>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm your booking</DialogTitle>
                    <DialogDescription>
                      Your Paris Highlights itinerary is ready to reserve.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogClose render={<Button className="w-fit" />}>Got it</DialogClose>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-col items-start gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Sheet</h3>
              <Sheet>
                <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Trip summary</SheetTitle>
                    <SheetDescription>Everything you have picked so far.</SheetDescription>
                  </SheetHeader>
                  <p className="px-4 text-gray-600">
                    Your itinerary, hotel, and add-ons appear here once you start planning.
                  </p>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <SectionHeading>Tabs</SectionHeading>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-4 text-gray-600">
                A hand-crafted itinerary with private transfers and flexible dates.
              </TabsContent>
              <TabsContent value="accommodation" className="pt-4 text-gray-600">
                Boutique stays, from restored riads to design hotels near the old town.
              </TabsContent>
              <TabsContent value="activities" className="pt-4 text-gray-600">
                Small-group tours and a cooking class with a local chef.
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* RangeFilterGroup */}
        <section className="space-y-4">
          <SectionHeading>RangeFilterGroup (shared)</SectionHeading>
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5">
            <RangeFilterGroup
              label="Trip duration"
              options={durationOptions}
              selected={selectedDuration}
              onChange={setSelectedDuration}
            />
            <p className="text-sm text-gray-500">
              Selected: <span className="font-medium text-gray-800">{selectedDuration?.label ?? 'None'}</span>
            </p>
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-8">
          <SectionHeading>Color tokens</SectionHeading>
          <ColorScale title="Brand (primary)" tokens={brandScale} />
          <ColorScale title="Brand dark (surface shades)" tokens={brandDarkScale} />
          <ColorScale title="Brand accent" tokens={brandAccentScale} />
          <ColorScale title="Gray (neutral, overridden Tailwind scale)" tokens={grayScale} />
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <SectionHeading>Typography</SectionHeading>
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            {typeScaleSamples.map((sample) => (
              <TypeSample key={sample.token} {...sample} />
            ))}
          </div>
        </section>

        {/* Z-index scale */}
        <section className="space-y-4">
          <SectionHeading>Stacking-order tokens</SectionHeading>
          <div className="max-w-xl divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {zIndexTokens.map(({ name, value, tier }) => (
              <div key={name} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <code className="text-sm text-gray-800">{name}</code>
                  <span className="text-[11px] text-gray-400">{tier}</span>
                </div>
                <span className="font-mono text-sm text-gray-600">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
