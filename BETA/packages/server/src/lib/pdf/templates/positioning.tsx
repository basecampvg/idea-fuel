import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles, colors } from './base-styles';

interface PositioningData {
  ideaTitle: string;
  ideaDescription: string;
  generatedAt: Date;
  tier: 'BASIC' | 'PRO' | 'FULL';

  // Brand Positioning
  positioningStatement?: string;
  tagline?: string;
  brandVoice?: string;
  brandPersonality?: string[];

  // Target Audience
  targetAudience?: string;
  customerPersona?: {
    name: string;
    demographics: string;
    psychographics: string;
    painPoints: string[];
    goals: string[];
  };

  // Messaging Framework
  keyMessages?: string[];
  valuePillars?: Array<{
    pillar: string;
    description: string;
  }>;

  // Differentiation
  uniqueSellingPoints?: string[];
  competitivePositioning?: string;

  // Brand Identity (PRO/FULL)
  brandColors?: string[];
  visualStyle?: string;
  toneGuidelines?: string[];

  // Messaging by Channel (FULL)
  channelMessaging?: Array<{
    channel: string;
    headline: string;
    subheadline: string;
    cta: string;
  }>;
}

// ============================================
// COMPONENTS
// ============================================

function Header({ title, ideaTitle, date, tier }: { title: string; ideaTitle: string; date: Date; tier: string }) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>FORGE</Text>
        <Text style={baseStyles.logoTagline}>Brand Strategy</Text>
      </View>
      <Text style={baseStyles.reportTitle}>{title}</Text>
      <Text style={baseStyles.ideaTitle}>{ideaTitle}</Text>
      <View style={baseStyles.metaRow}>
        <View style={baseStyles.metaItem}>
          <Text style={baseStyles.metaLabel}>Generated</Text>
          <Text style={baseStyles.metaValue}>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={baseStyles.metaItem}>
          <Text style={baseStyles.metaLabel}>Report Tier</Text>
          <Text style={baseStyles.metaValue}>{tier}</Text>
        </View>
      </View>
    </View>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>FORGE</Text>
      </View>
      <Text style={[baseStyles.h2, { marginBottom: 0 }]}>{title}</Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ title, children }: { title: string; children?: any }) {
  return (
    <View style={baseStyles.section}>
      <Text style={baseStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={baseStyles.list}>
      {items.map((item, index) => (
        <View key={index} style={baseStyles.bulletPoint}>
          <Text style={baseStyles.bullet}>•</Text>
          <Text style={baseStyles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function NumberedList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={baseStyles.list}>
      {items.map((item, index) => (
        <View key={index} style={baseStyles.numberedItem}>
          <Text style={baseStyles.number}>{index + 1}.</Text>
          <Text style={baseStyles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({ pageNumber }: { pageNumber: number }) {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerLeft}>
        <Text style={baseStyles.footerLogo}>FORGE</Text>
        <View style={baseStyles.footerDivider} />
        <Text style={baseStyles.footerConfidential}>Confidential</Text>
      </View>
      <Text style={baseStyles.pageNumber}>Page {pageNumber}</Text>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PositioningPDF({ data }: { data: PositioningData }) {
  const isPro = data.tier === 'PRO' || data.tier === 'FULL';
  const isFull = data.tier === 'FULL';

  return (
    <Document>
      {/* Page 1: Positioning Statement & Brand Voice */}
      <Page size="A4" style={baseStyles.page}>
        <Header title="Brand Positioning" ideaTitle={data.ideaTitle} date={data.generatedAt} tier={data.tier} />

        <Section title="Positioning Statement">
          <View style={baseStyles.highlightCard}>
            <Text style={[baseStyles.paragraph, { marginBottom: 0, fontWeight: 500, fontSize: 11 }]}>
              {data.positioningStatement || 'Positioning statement pending research completion.'}
            </Text>
          </View>
        </Section>

        {data.tagline && (
          <View
            style={[
              baseStyles.card,
              {
                backgroundColor: colors.surface,
                alignItems: 'center',
                paddingVertical: 24,
              },
            ]}
          >
            <Text style={baseStyles.label}>Tagline</Text>
            <Text style={[baseStyles.h2, { textAlign: 'center', color: colors.accent, marginBottom: 0 }]}>
              "{data.tagline}"
            </Text>
          </View>
        )}

        {data.brandVoice && (
          <Section title="Brand Voice">
            <Text style={baseStyles.paragraph}>{data.brandVoice}</Text>
          </Section>
        )}

        {data.brandPersonality && data.brandPersonality.length > 0 && (
          <Section title="Brand Personality">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {data.brandPersonality.map((trait, index) => (
                <View key={index} style={baseStyles.badge}>
                  <Text style={baseStyles.badgeText}>{trait}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Footer pageNumber={1} />
      </Page>

      {/* Page 2: Target Audience */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Target Audience" />

        <Section title="Audience Overview">
          <Text style={baseStyles.paragraph}>{data.targetAudience || 'Target audience analysis pending.'}</Text>
        </Section>

        {data.customerPersona && (
          <Section title="Ideal Customer Persona">
            <View style={baseStyles.card}>
              <View style={baseStyles.cardHeader}>
                <Text style={baseStyles.h3}>{data.customerPersona.name}</Text>
                <View style={baseStyles.badge}>
                  <Text style={baseStyles.badgeText}>Primary Persona</Text>
                </View>
              </View>

              <View style={baseStyles.twoColumn}>
                <View style={baseStyles.columnHalf}>
                  <Text style={baseStyles.label}>Demographics</Text>
                  <Text style={baseStyles.paragraphSmall}>{data.customerPersona.demographics}</Text>
                </View>
                <View style={baseStyles.columnHalf}>
                  <Text style={baseStyles.label}>Psychographics</Text>
                  <Text style={baseStyles.paragraphSmall}>{data.customerPersona.psychographics}</Text>
                </View>
              </View>

              <View style={baseStyles.dividerLight} />

              <View style={baseStyles.twoColumn}>
                <View style={baseStyles.columnHalf}>
                  <Text style={baseStyles.label}>Pain Points</Text>
                  <BulletList items={data.customerPersona.painPoints} />
                </View>
                <View style={baseStyles.columnHalf}>
                  <Text style={baseStyles.label}>Goals</Text>
                  <BulletList items={data.customerPersona.goals} />
                </View>
              </View>
            </View>
          </Section>
        )}

        <Footer pageNumber={2} />
      </Page>

      {/* Page 3: Messaging Framework */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Messaging Framework" />

        {data.keyMessages && data.keyMessages.length > 0 && (
          <Section title="Key Messages">
            <NumberedList items={data.keyMessages} />
          </Section>
        )}

        {data.valuePillars && data.valuePillars.length > 0 && (
          <Section title="Value Pillars">
            {data.valuePillars.map((pillar, index) => (
              <View key={index} style={baseStyles.infoCard}>
                <Text style={[baseStyles.h4, { color: colors.info }]}>{pillar.pillar}</Text>
                <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>{pillar.description}</Text>
              </View>
            ))}
          </Section>
        )}

        <Footer pageNumber={3} />
      </Page>

      {/* Page 4: Differentiation */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Competitive Differentiation" />

        {data.uniqueSellingPoints && data.uniqueSellingPoints.length > 0 && (
          <Section title="Unique Selling Points">
            {data.uniqueSellingPoints.map((usp, index) => (
              <View key={index} style={baseStyles.successCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={[baseStyles.number, { color: colors.success }]}>{index + 1}.</Text>
                  <Text style={[baseStyles.paragraph, { marginBottom: 0, flex: 1 }]}>{usp}</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        {data.competitivePositioning && (
          <Section title="Competitive Positioning">
            <Text style={baseStyles.paragraph}>{data.competitivePositioning}</Text>
          </Section>
        )}

        <Footer pageNumber={4} />
      </Page>

      {/* Page 5: Brand Identity (PRO/FULL) */}
      {isPro && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Brand Identity" />

          <Section title="Visual Guidelines">
            {data.visualStyle && (
              <View style={baseStyles.card}>
                <Text style={baseStyles.label}>Visual Style</Text>
                <Text style={baseStyles.paragraph}>{data.visualStyle}</Text>
              </View>
            )}

            {data.brandColors && data.brandColors.length > 0 && (
              <>
                <Text style={baseStyles.label}>Brand Colors</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  {data.brandColors.map((color, index) => (
                    <View key={index} style={baseStyles.card}>
                      <Text style={baseStyles.paragraphSmall}>{color}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {data.toneGuidelines && data.toneGuidelines.length > 0 && (
              <>
                <Text style={baseStyles.label}>Tone Guidelines</Text>
                <BulletList items={data.toneGuidelines} />
              </>
            )}
          </Section>

          <Footer pageNumber={5} />
        </Page>
      )}

      {/* Page 6: Channel Messaging (FULL) */}
      {isFull && data.channelMessaging && data.channelMessaging.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Channel Strategy" />

          <Section title="Messaging by Channel">
            {data.channelMessaging.map((channel, index) => (
              <View key={index} style={baseStyles.card}>
                <View style={baseStyles.cardHeader}>
                  <Text style={baseStyles.h3}>{channel.channel}</Text>
                </View>
                <View style={baseStyles.twoColumn}>
                  <View style={baseStyles.columnHalf}>
                    <Text style={baseStyles.label}>Headline</Text>
                    <Text style={[baseStyles.paragraphSmall, { fontWeight: 600 }]}>{channel.headline}</Text>
                    <Text style={baseStyles.label}>Subheadline</Text>
                    <Text style={baseStyles.paragraphSmall}>{channel.subheadline}</Text>
                  </View>
                  <View style={baseStyles.columnHalf}>
                    <Text style={baseStyles.label}>Call to Action</Text>
                    <View style={[baseStyles.badge, { alignSelf: 'flex-start' }]}>
                      <Text style={baseStyles.badgeText}>{channel.cta}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </Section>

          <Footer pageNumber={6} />
        </Page>
      )}
    </Document>
  );
}

export default PositioningPDF;
