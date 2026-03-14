import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles, colors } from './base-styles';

// ============================================
// TYPES
// ============================================

interface ValuePillar {
  theme: string;
  attributes: string[];
  customerBenefit: string;
  proof: string;
}

interface CustomerPersona {
  name: string;
  role: string;
  demographics: string;
  psychographics: string;
  painPoints: string[];
  goals: string[];
  buyingTriggers: string[];
  dayInTheLife: string;
}

interface MessagingFramework {
  headline: string;
  subheadline: string;
  elevatorPitch: string;
  objectionHandlers: Array<{ objection: string; response: string }>;
}

interface ChannelMessage {
  channel: string;
  headline: string;
  subheadline: string;
  cta: string;
  rationale: string;
}

export interface PositioningData {
  ideaTitle: string;
  ideaDescription: string;
  generatedAt: Date;
  tier: 'BASIC' | 'PRO' | 'FULL';

  // Strategic Foundation
  competitiveAlternatives?: string;
  uniqueAttributes?: string;
  valuePillars?: ValuePillar[];

  // Target Customer
  targetAudience?: string;
  customerPersona?: CustomerPersona;

  // Market Category & Positioning
  marketCategory?: string;
  positioningStatement?: string;
  competitivePositioning?: string;

  // Messaging Framework
  tagline?: string;
  keyMessages?: string[];
  messagingFramework?: MessagingFramework;

  // Brand Expression
  brandVoice?: string;
  brandPersonality?: string[];

  // Trend Layer
  trendLayer?: string;

  // PRO/FULL
  visualStyle?: string;
  toneGuidelines?: string[];
  brandColors?: string[];

  // FULL
  channelMessaging?: ChannelMessage[];
}

// ============================================
// SHARED COMPONENTS
// ============================================

function Header({ title, ideaTitle, date, tier }: { title: string; ideaTitle: string; date: Date; tier: string }) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>ideationLab</Text>
        <Text style={baseStyles.logoTagline}>Positioning Strategy</Text>
      </View>
      <Text style={baseStyles.reportTitle}>{title}</Text>
      <Text style={baseStyles.ideaTitle}>{ideaTitle}</Text>
      <View style={baseStyles.metaRow}>
        <View style={baseStyles.metaItem}>
          <Text style={baseStyles.metaLabel}>Generated</Text>
          <Text style={baseStyles.metaValue}>
            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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
        <Text style={baseStyles.logo}>ideationLab</Text>
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

function Narrative({ text }: { text: string }) {
  // Split on double newlines for paragraphs, render bullets inline
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <>
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        const bulletLines = lines.filter(l => l.startsWith('- ') || l.startsWith('* '));
        const textLines = lines.filter(l => !l.startsWith('- ') && !l.startsWith('* '));
        return (
          <View key={i}>
            {textLines.length > 0 && (
              <Text style={baseStyles.paragraph}>
                {textLines.join(' ').replace(/\*\*(.*?)\*\*/g, '$1')}
              </Text>
            )}
            {bulletLines.length > 0 && (
              <View style={baseStyles.list}>
                {bulletLines.map((line, j) => (
                  <View key={j} style={baseStyles.bulletPoint}>
                    <Text style={baseStyles.bullet}>•</Text>
                    <Text style={baseStyles.bulletText}>
                      {line.replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={baseStyles.list}>
      {items.map((item, index) => (
        <View key={index} style={baseStyles.bulletPoint}>
          <Text style={baseStyles.bullet}>•</Text>
          <Text style={baseStyles.bulletText}>{item.replace(/\*\*(.*?)\*\*/g, '$1')}</Text>
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
          <Text style={baseStyles.bulletText}>{item.replace(/\*\*(.*?)\*\*/g, '$1')}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer() {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerLeft}>
        <Text style={baseStyles.footerLogo}>ideationLab</Text>
        <View style={baseStyles.footerDivider} />
        <Text style={baseStyles.footerConfidential}>Confidential</Text>
      </View>
      <Text
        style={baseStyles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
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
      {/* Page 1: Cover — Positioning Statement & Tagline */}
      <Page size="A4" style={baseStyles.page}>
        <Header title="Positioning Strategy" ideaTitle={data.ideaTitle} date={data.generatedAt} tier={data.tier} />

        {data.tagline && (
          <View
            style={[
              baseStyles.card,
              { backgroundColor: colors.surface, alignItems: 'center', paddingVertical: 24 },
            ]}
          >
            <Text style={baseStyles.label}>Tagline</Text>
            <Text style={[baseStyles.h2, { textAlign: 'center', color: colors.accent, marginBottom: 0 }]}>
              &ldquo;{data.tagline}&rdquo;
            </Text>
          </View>
        )}

        <Section title="Positioning Statement">
          <View style={baseStyles.highlightCard}>
            <Narrative text={data.positioningStatement || 'Positioning statement pending research completion.'} />
          </View>
        </Section>

        <Footer />
      </Page>

      {/* Page 2: Competitive Alternatives */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Competitive Alternatives" />

        <Section title="What Customers Do Today">
          <Narrative text={data.competitiveAlternatives || 'Competitive alternatives analysis pending.'} />
        </Section>

        {data.uniqueAttributes && (
          <Section title="Unique Attributes">
            <Narrative text={data.uniqueAttributes} />
          </Section>
        )}

        <Footer />
      </Page>

      {/* Page 3: Value Pillars */}
      {data.valuePillars && data.valuePillars.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Value Pillars" />

          <Section title="Value Themes">
            {data.valuePillars.map((pillar, index) => (
              <View key={index} style={baseStyles.infoCard}>
                <Text style={[baseStyles.h3, { color: colors.info, marginBottom: 10 }]}>
                  {index + 1}. {pillar.theme}
                </Text>

                <Text style={baseStyles.label}>Unique Attributes</Text>
                <BulletList items={pillar.attributes} />

                <View style={baseStyles.dividerLight} />

                <Text style={baseStyles.label}>Customer Benefit</Text>
                <Text style={[baseStyles.paragraph, { marginBottom: 8 }]}>{pillar.customerBenefit}</Text>

                <Text style={baseStyles.label}>Evidence</Text>
                <Text style={[baseStyles.paragraphSmall, { marginBottom: 0, fontStyle: 'italic' }]}>
                  {pillar.proof}
                </Text>
              </View>
            ))}
          </Section>

          <Footer />
        </Page>
      )}

      {/* Page 4: Target Customer */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Target Customer" />

        <Section title="Audience Overview">
          <Narrative text={data.targetAudience || 'Target audience analysis pending.'} />
        </Section>

        {data.customerPersona && (
          <Section title="Ideal Customer Profile">
            <View style={baseStyles.card}>
              <View style={baseStyles.cardHeader}>
                <Text style={baseStyles.h3}>{data.customerPersona.name}</Text>
                <View style={baseStyles.badge}>
                  <Text style={baseStyles.badgeText}>{data.customerPersona.role}</Text>
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

              <View style={baseStyles.dividerLight} />

              <Text style={baseStyles.label}>Buying Triggers</Text>
              <BulletList items={data.customerPersona.buyingTriggers} />

              {data.customerPersona.dayInTheLife && (
                <>
                  <View style={baseStyles.dividerLight} />
                  <Text style={baseStyles.label}>A Day in Their Life</Text>
                  <Text style={baseStyles.paragraphSmall}>{data.customerPersona.dayInTheLife}</Text>
                </>
              )}
            </View>
          </Section>
        )}

        <Footer />
      </Page>

      {/* Page 5: Market Category & Competitive Positioning */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Market Category & Positioning" />

        {data.marketCategory && (
          <Section title="Market Category">
            <Narrative text={data.marketCategory} />
          </Section>
        )}

        {data.competitivePositioning && (
          <Section title="Competitive Positioning">
            <Narrative text={data.competitivePositioning} />
          </Section>
        )}

        <Footer />
      </Page>

      {/* Page 6: Messaging Framework */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Messaging Framework" />

        {data.messagingFramework && (
          <Section title="Core Messaging">
            <View style={baseStyles.highlightCard}>
              <Text style={baseStyles.label}>Headline</Text>
              <Text style={[baseStyles.h3, { marginBottom: 8 }]}>{data.messagingFramework.headline}</Text>
              <Text style={baseStyles.label}>Subheadline</Text>
              <Text style={[baseStyles.paragraph, { marginBottom: 8 }]}>{data.messagingFramework.subheadline}</Text>
              <Text style={baseStyles.label}>Elevator Pitch</Text>
              <Text style={[baseStyles.paragraph, { marginBottom: 0, fontStyle: 'italic' }]}>
                {data.messagingFramework.elevatorPitch}
              </Text>
            </View>
          </Section>
        )}

        {data.keyMessages && data.keyMessages.length > 0 && (
          <Section title="Key Messages">
            <NumberedList items={data.keyMessages} />
          </Section>
        )}

        {data.messagingFramework?.objectionHandlers && data.messagingFramework.objectionHandlers.length > 0 && (
          <Section title="Objection Handlers">
            {data.messagingFramework.objectionHandlers.map((handler, index) => (
              <View key={index} style={baseStyles.card}>
                <Text style={[baseStyles.paragraphSmall, { fontWeight: 600, color: colors.error, marginBottom: 4 }]}>
                  Objection: {handler.objection}
                </Text>
                <Text style={[baseStyles.paragraphSmall, { color: colors.success, marginBottom: 0 }]}>
                  Response: {handler.response}
                </Text>
              </View>
            ))}
          </Section>
        )}

        <Footer />
      </Page>

      {/* Page 7: Brand Expression & Trend Layer */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Brand Expression" />

        {data.brandVoice && (
          <Section title="Brand Voice">
            <Narrative text={data.brandVoice} />
          </Section>
        )}

        {data.brandPersonality && data.brandPersonality.length > 0 && (
          <Section title="Brand Personality">
            <BulletList items={data.brandPersonality} />
          </Section>
        )}

        {data.trendLayer && (
          <Section title="Market Trend Layer">
            <View style={baseStyles.infoCard}>
              <Narrative text={data.trendLayer} />
            </View>
          </Section>
        )}

        <Footer />
      </Page>

      {/* Page 8 (PRO/FULL): Visual Identity */}
      {isPro && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Visual Identity" />

          {data.visualStyle && (
            <Section title="Visual Style">
              <Narrative text={data.visualStyle} />
            </Section>
          )}

          {data.brandColors && data.brandColors.length > 0 && (
            <Section title="Brand Colors">
              <BulletList items={data.brandColors} />
            </Section>
          )}

          {data.toneGuidelines && data.toneGuidelines.length > 0 && (
            <Section title="Tone Guidelines">
              <NumberedList items={data.toneGuidelines} />
            </Section>
          )}

          <Footer />
        </Page>
      )}

      {/* Page 9 (FULL): Channel Messaging Strategy */}
      {isFull && data.channelMessaging && data.channelMessaging.length > 0 && (
        <Page size="A4" style={baseStyles.page} wrap>
          <PageHeader title="Channel Messaging Strategy" />

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
                    <View style={[baseStyles.badge, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={baseStyles.badgeText}>{channel.cta}</Text>
                    </View>
                    <Text style={baseStyles.label}>Rationale</Text>
                    <Text style={[baseStyles.paragraphSmall, { fontStyle: 'italic' }]}>{channel.rationale}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Section>

          <Footer />
        </Page>
      )}
    </Document>
  );
}

export default PositioningPDF;
