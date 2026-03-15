'use client';

import { useState, useCallback } from 'react';
import { ArrowUp, X, Plus } from 'lucide-react';
import type { BusinessContext, RevenueRange, CustomerType, GeographicFocus, TeamSize } from '@forge/shared';

interface BusinessContextIntakeProps {
  onSubmit: (title: string, context: Omit<BusinessContext, 'classification'>) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const revenueOptions: { value: RevenueRange; label: string }[] = [
  { value: '<100K', label: 'Under $100K' },
  { value: '100K-500K', label: '$100K - $500K' },
  { value: '500K-2M', label: '$500K - $2M' },
  { value: '2M+', label: '$2M+' },
];

const customerTypeOptions: { value: CustomerType; label: string }[] = [
  { value: 'B2C', label: 'Consumers (B2C)' },
  { value: 'B2B', label: 'Businesses (B2B)' },
  { value: 'mixed', label: 'Both' },
];

const geoOptions: { value: GeographicFocus; label: string }[] = [
  { value: 'local', label: 'Local / Regional' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
];

const teamOptions: { value: TeamSize; label: string }[] = [
  { value: 'solo', label: 'Solo' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-20', label: '6-20 people' },
  { value: '20+', label: '20+ people' },
];

export function BusinessContextIntake({ onSubmit, onBack, isSubmitting }: BusinessContextIntakeProps) {
  const [businessName, setBusinessName] = useState('');
  const [industryVertical, setIndustryVertical] = useState('');
  const [yearsInOperation, setYearsInOperation] = useState('');
  const [revenueRange, setRevenueRange] = useState<RevenueRange | ''>('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [currentProducts, setCurrentProducts] = useState<string[]>(['']);
  const [geographicFocus, setGeographicFocus] = useState<GeographicFocus | ''>('');
  const [teamSize, setTeamSize] = useState<TeamSize | ''>('');

  const isValid =
    industryVertical.trim().length > 0 &&
    yearsInOperation.trim().length > 0 &&
    revenueRange !== '' &&
    customerType !== '' &&
    currentProducts.some(p => p.trim().length > 0) &&
    geographicFocus !== '' &&
    teamSize !== '';

  const handleAddProduct = useCallback(() => {
    setCurrentProducts(prev => [...prev, '']);
  }, []);

  const handleRemoveProduct = useCallback((index: number) => {
    setCurrentProducts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleProductChange = useCallback((index: number, value: string) => {
    setCurrentProducts(prev => prev.map((p, i) => (i === index ? value : p)));
  }, []);

  const handleSubmit = () => {
    if (!isValid || isSubmitting) return;

    const products = currentProducts.filter(p => p.trim().length > 0);
    const title = businessName.trim() || `${industryVertical.trim()} Expansion`;

    onSubmit(title, {
      businessName: businessName.trim() || undefined,
      industryVertical: industryVertical.trim(),
      yearsInOperation: parseInt(yearsInOperation, 10),
      revenueRange: revenueRange as RevenueRange,
      customerType: customerType as CustomerType,
      currentProducts: products,
      geographicFocus: geographicFocus as GeographicFocus,
      teamSize: teamSize as TeamSize,
    });
  };

  return (
    <div className="w-full max-w-xl animate-fade-in-up">
      <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 shadow-xl shadow-black/5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Tell us about your business</h2>
            <p className="text-xs text-muted-foreground mt-1">This helps us tailor the expansion analysis</p>
          </div>
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Business Name (optional) */}
          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              Business Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
              maxLength={200}
              disabled={isSubmitting}
            />
          </div>

          {/* Industry */}
          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              Industry / Vertical <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={industryVertical}
              onChange={(e) => setIndustryVertical(e.target.value)}
              placeholder="e.g., Digital Marketing, Plumbing, SaaS Analytics"
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
              maxLength={200}
              disabled={isSubmitting}
            />
          </div>

          {/* Years + Revenue row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Years in Business <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                value={yearsInOperation}
                onChange={(e) => setYearsInOperation(e.target.value)}
                placeholder="3"
                min={0}
                max={200}
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Annual Revenue <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {revenueOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRevenueRange(opt.value)}
                    disabled={isSubmitting}
                    className={`
                      px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border
                      ${revenueRange === opt.value
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/30'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Type + Geographic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Customer Type <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {customerTypeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCustomerType(opt.value)}
                    disabled={isSubmitting}
                    className={`
                      px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border
                      ${customerType === opt.value
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/30'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Geographic Focus <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {geoOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGeographicFocus(opt.value)}
                    disabled={isSubmitting}
                    className={`
                      px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border
                      ${geographicFocus === opt.value
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/30'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              Team Size <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {teamOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTeamSize(opt.value)}
                  disabled={isSubmitting}
                  className={`
                    px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border
                    ${teamSize === opt.value
                      ? 'bg-primary/15 text-primary border-primary/40'
                      : 'bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/30'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Products */}
          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              Current Products / Services <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {currentProducts.map((product, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    placeholder={`Product or service ${index + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    maxLength={200}
                    disabled={isSubmitting}
                  />
                  {currentProducts.length > 1 && (
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {currentProducts.length < 10 && (
                <button
                  onClick={handleAddProduct}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end mt-6 pt-4 border-t border-border/30">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-accent text-accent-foreground font-medium text-sm
              shadow-lg shadow-accent/25
              hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02]
              active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100
              transition-all duration-200
            "
          >
            {isSubmitting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
            Analyze My Business
          </button>
        </div>
      </div>
    </div>
  );
}
