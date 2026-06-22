'use client';

import { welcome } from '../data/data';
import EditableText from './EditableText';

/**
 * COMPONENTE WELCOME / BIENVENIDA
 *
 * Cada párrafo y el pull-quote son EditableText: en modo edición los
 * editores pueden cambiar el copy inline. Los valores quedan en
 * site_settings (DB). El array de data.js es el fallback.
 */
function Welcome() {
  const { paragraphs, pullQuote, pullQuoteAfter } = welcome;
  const paragraphKeys = [
    'welcome_p1',
    'welcome_p2',
    'welcome_p3',
    'welcome_p4',
    'welcome_p5',
  ];

  return (
    <section id="bienvenida" className="seccion-bienvenida">
      <div className="bienvenida-content">
        {paragraphs.map((paragraph, index) => (
          <div key={index}>
            <EditableText
              settingKey={paragraphKeys[index] || `welcome_p${index + 1}`}
              fallback={paragraph}
              as="p"
              multiline
              maxLength={2000}
            />
            {pullQuote && index === pullQuoteAfter && (
              <EditableText
                settingKey="welcome_pull_quote"
                fallback={pullQuote}
                as="blockquote"
                multiline
                maxLength={400}
                className="bienvenida-pull-quote"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default Welcome;
