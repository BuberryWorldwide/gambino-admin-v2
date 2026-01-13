'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempToken, setTempToken] = useState('');

  const [form, setForm] = useState({
    // Step 1: Personal info
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    password: '',
    
    // Step 2: Legal agreements
    agreedToTerms: false,
    agreedToPrivacy: false,
    agreedToMarketing: false,
    readWhitepaper: false,
    
    // Step 3: Optional deposit
    depositAmount: 0, 
    paymentMethod: 'cash'
  });

  const router = useRouter();

  const nextStep = async () => {
    setError('');
    try {
      if (step === 1) {
        // STEP 1: Personal Information
        setLoading(true);
        const { data } = await api.post('/api/onboarding/step1', {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password
        });
        setTempToken(data.tempToken);
        setStep(2);
        
      } else if (step === 2) {
        // STEP 2: Terms & Privacy
        if (!form.agreedToTerms) { 
          setError('You must agree to the Terms of Service'); 
          return; 
        }
        if (!form.agreedToPrivacy) { 
          setError('You must agree to the Privacy Policy'); 
          return; 
        }
        
        setLoading(true);
         await api.post('/api/onboarding/step2', {
         tempToken, // ✅ must send in body
         acceptTerms: form.agreedToTerms,
         acceptPrivacy: form.agreedToPrivacy,
         marketingOptIn: form.agreedToMarketing,
         readWhitepaper: form.readWhitepaper
       });
        setStep(3);
        
      } else if (step === 3) {
        // STEP 3: Complete Account (with optional deposit)
        setLoading(true);
          // step === 3 case
          const { data } = await api.post(
            '/api/onboarding/step3',
            { initialDeposit: Number(form.depositAmount || 0), paymentMethod: form.paymentMethod },
            { headers: { Authorization: `Bearer ${tempToken}` } }
          );
          

          const token = data.accessToken || data.token;
          if (token) setToken(token);
          setStep(4);
          setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-gold">Welcome to Gambino</h1>
        <p className="text-zinc-400">Prove Your Luck.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1,2,3].map(n => (
          <div key={n} className={`h-2 w-16 rounded-full ${step >= n ? 'bg-gold' : 'bg-zinc-800'}`} />
        ))}
      </div>

      <div className="card space-y-4">
        
        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <input 
                className="input" 
                placeholder="First name"
                value={form.firstName} 
                onChange={e => updateForm('firstName', e.target.value)}
                required
              />
              <input 
                className="input" 
                placeholder="Last name"
                value={form.lastName} 
                onChange={e => updateForm('lastName', e.target.value)}
                required
              />
            </div>
            <input 
              className="input mt-3" 
              type="email" 
              placeholder="Email"
              value={form.email} 
              onChange={e => updateForm('email', e.target.value)}
              required
            />
            <input 
              className="input mt-3" 
              type="tel" 
              placeholder="Phone (optional)"
              value={form.phone} 
              onChange={e => updateForm('phone', e.target.value)}
            />
            <input 
              className="input mt-3" 
              type="password" 
              placeholder="Password (min 6 characters)"
              value={form.password} 
              onChange={e => updateForm('password', e.target.value)}
              required
            />
          </div>
        )}

        {/* STEP 2: Terms & Privacy */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Legal Agreements</h2>
            <div className="space-y-4">
              
              {/* Required Agreements */}
              <div className="border border-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">Required</h3>
                
                <label className="flex items-start space-x-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.agreedToTerms}
                    onChange={e => updateForm('agreedToTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 text-gold bg-zinc-800 border-zinc-600 rounded focus:ring-gold focus:ring-2"
                    required
                  />
                  <span className="text-sm text-zinc-300">
                    I agree to the{' '}
                    <a href="https://gambino.gold/legal/vdv-terms" target="_blank" className="text-gold hover:text-yellow-400 underline">
                      VDV Terms of Service
                    </a>
                    {' '}and understand the risks of cryptocurrency
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreedToPrivacy}
                    onChange={e => updateForm('agreedToPrivacy', e.target.checked)}
                    className="mt-1 w-4 h-4 text-gold bg-zinc-800 border-zinc-600 rounded focus:ring-gold focus:ring-2"
                    required
                  />
                  <span className="text-sm text-zinc-300">
                    I agree to the{' '}
                    <a href="https://gambino.gold/legal/vdv-privacy" target="_blank" className="text-gold hover:text-yellow-400 underline">
                      VDV Privacy Policy
                    </a>
                    {' '}and data collection practices
                  </span>
                </label>
              </div>

              {/* Optional Agreements */}
              <div className="border border-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">Optional</h3>
                
                <label className="flex items-start space-x-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.agreedToMarketing}
                    onChange={e => updateForm('agreedToMarketing', e.target.checked)}
                    className="mt-1 w-4 h-4 text-gold bg-zinc-800 border-zinc-600 rounded focus:ring-gold focus:ring-2"
                  />
                  <span className="text-sm text-zinc-300">
                    I want to receive updates and marketing communications
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.readWhitepaper}
                    onChange={e => updateForm('readWhitepaper', e.target.checked)}
                    className="mt-1 w-4 h-4 text-gold bg-zinc-800 border-zinc-600 rounded focus:ring-gold focus:ring-2"
                  />
                  <span className="text-sm text-zinc-300">
                    I have read the whitepaper and understand the tokenomics
                  </span>
                </label>
              </div>

              {/* Info Links */}
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-400 mb-2">For complete documentation:</p>
                <a 
                  href="/info" 
                  target="_blank" 
                  className="text-gold hover:text-yellow-400 text-sm underline"
                >
                  View Whitepaper, Terms & Regulatory Info →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Optional Deposit */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Optional Initial Deposit</h2>
            <div className="text-center mb-4">
              <p className="text-zinc-400 mb-2">
                You can add funds now or skip and deposit later in your dashboard
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Deposit Amount (USD)</label>
                <input 
                  className="input" 
                  type="number" 
                  min="0" 
                  step="1"
                  placeholder="0 (skip for now)"
                  value={form.depositAmount || ''} 
                  onChange={e => updateForm('depositAmount', e.target.value)}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  ${form.depositAmount || 0} = {Math.floor((form.depositAmount || 0) / 0.001).toLocaleString()} GAMBINO tokens
                </p>
              </div>
              
              {form.depositAmount > 0 && (
                <div>
                  <label className="label">Payment Method</label>
                  <select 
                    className="input"
                    value={form.paymentMethod} 
                    onChange={e => updateForm('paymentMethod', e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="text-emerald-400 text-2xl font-bold mb-2">Account Created! 🎉</div>
            <div className="text-zinc-400 mb-4">Welcome to Gambino Coin</div>
            
            {form.depositAmount > 0 && (
              <div className="card border-emerald-600 mb-4">
                <div className="text-3xl font-extrabold text-gold">
                  {Math.floor((form.depositAmount || 0) / 0.001).toLocaleString()}
                </div>
                <div className="text-zinc-400">GAMBINO Tokens Ready</div>
              </div>
            )}
            
            <div className="text-sm text-zinc-500">
              <p>✅ No wallet created yet - generate one in your dashboard</p>
              <p>✅ Select your location later when you're ready to play</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between pt-4 border-t border-zinc-700">
            <button 
              className="btn btn-ghost" 
              disabled={step === 1 || loading} 
              onClick={() => setStep(step - 1)}
            >
              ← Previous
            </button>
            
            <button 
              className="btn btn-gold" 
              onClick={nextStep}
              disabled={loading || (step === 2 && (!form.agreedToTerms || !form.agreedToPrivacy))}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Working...
                </div>
              ) : (
                step === 3 ? 'Complete Account' : 'Continue →'
              )}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center pt-4 border-t border-zinc-700">
            <button 
              className="btn btn-gold" 
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>

      {/* Risk Warning */}
      {(step === 2 || step === 3) && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded text-xs text-yellow-300">
          <strong>Risk Warning:</strong> Cryptocurrency involves substantial risk. Only invest what you can afford to lose.
        </div>
      )}
    </div>
  );
}