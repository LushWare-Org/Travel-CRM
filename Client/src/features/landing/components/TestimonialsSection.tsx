import BRANDING from '../../../config/branding';
import { useElfsightWidget } from '../../../lib/elfsight';
import { HEADER_TITLE, HEADER_SUBTITLE } from '../../../content/testimonials';

export default function TestimonialsSection() {
  const elRef = useElfsightWidget();

  if (!BRANDING.integrations.elfsightAppId) {
    return null;
  }

  return (
    <>
      {/* Google Reviews */}
      <section className="py-20 bg-white font-opensans">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
              {HEADER_TITLE}
            </h2>
            <p className="text-lg text-gray-600">
              {HEADER_SUBTITLE}
            </p>
          </div>
          <div className="flex justify-center">
            <div
              ref={elRef}
              className={`elfsight-app-${BRANDING.integrations.elfsightAppId}`}
              data-elfsight-app-lazy
            ></div>
          </div>
        </div>
      </section>
    </>
  );
}
