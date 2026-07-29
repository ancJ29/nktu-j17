import { ActionIcon, Affix, Transition } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconArrowUp } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const BOTTOM_NAV_HEIGHT = 64;

const NAV_GAP = 12;

const MIN_REVEAL_PX = 600;
const REVEAL_VIEWPORTS = 1.5;

const HIDE_RATIO = 0.7;

export function ScrollToTopButton() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const evaluate = () => {
      frame = 0;
      const reveal = Math.max(MIN_REVEAL_PX, window.innerHeight * REVEAL_VIEWPORTS);
      const y = window.scrollY;

      setVisible((shown) => (shown ? y > reveal * HIDE_RATIO : y > reveal));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    evaluate();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Affix
      position={{
        bottom: `calc(${BOTTOM_NAV_HEIGHT + NAV_GAP}px + env(safe-area-inset-bottom))`,
        left: '50%',
      }}

      zIndex={99}

      style={{ transform: 'translateX(-50%)' }}
    >
      <Transition transition="slide-up" mounted={visible} duration={150}>
        {(styles) => (
          <ActionIcon
            style={styles}

            size={48}
            radius="xl"
            variant="filled"
            aria-label={t('__new__.01-common.actions.backToTop')}
            onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
          >
            <IconArrowUp size={22} />
          </ActionIcon>
        )}
      </Transition>
    </Affix>
  );
}
