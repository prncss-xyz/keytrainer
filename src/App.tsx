/** @jsxImportSource @emotion/react */

import useList, { State } from './components/list';
import { ratioThreshold, statsHalfLife } from './components/constants';
import { useTheme, Global } from '@emotion/react';
import { useEffect } from 'react';
import { CSSTransition } from 'react-transition-group';

const characters = 'etisuranovpdzlbjkmxgyqwfhc, ';

function Pads({ amount }: { amount: number }) {
  const res = [];
  for (let i = 0; i < amount; ++i)
    res.push(<div key={i} css={{ width: '50px' }}></div>);
  return <>{res}</>;
}

function InfoZone({ state }: { state: State }) {
  const theme = useTheme() as any;

  // characters per minute
  const cpm = state.delayMean && 60000 / state.delayMean;

  return (
    <div
      css={{
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <table
        css={{
          fontSize: '16px',
          color: theme.colors.muted,
        }}
      >
        <tr>
          <td css={{ textAlign: 'right' }}>accuracy</td>
          <td
            css={{
              fontWeight: 'normal',
              width: '30px',
              color:
                state.succRatio > ratioThreshold
                  ? theme.colors.good
                  : theme.colors.text,
              textAlign: 'center',
            }}
          >
            {Math.round(state.succRatio * 100)}
          </td>
          <td css={{ textAlign: 'left' }}>%</td>
        </tr>
        <tr>
          <td css={{ textAlign: 'right' }}>speed</td>
          <td css={{ color: theme.colors.text, textAlign: 'center' }}>
            {state.targets[state.position].index > statsHalfLife / 2 && cpm
              ? Math.round(cpm)
              : '\u2013'}
          </td>
          <td css={{ textAlign: 'left' }}>char / min</td>
        </tr>
      </table>
    </div>
  );
}

function LettersZone({ state }: { state: State }) {
  const theme = useTheme() as any;
  const mainTarget = state.targets[state.position];

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '200px',
      }}
    >
      <div
        css={{
          display: 'flex',
          borderBottomStyle: 'solid',
          borderWidth: '1px',
          paddingBottom: '10px',
          borderColor: theme.colors.muted,
        }}
      >
        <Pads amount={7 - state.targets.length} />
        {state.targets.map(target => {
          let color = undefined;
          if (target.index === mainTarget?.index) {
            color = theme.colors.focus;
            if (!state.correct) color = theme.colors.error;
          }
          if (target.firstTime) color = theme.colors.new;
          if (target.index < mainTarget?.index) {
            color = theme.colors.muted;
            if (target.firstTime) color = theme.colors.mutedNew;
          }
          return (
            <CSSTransition
              key={target.index}
              classNames='character'
              timeout={0}
            >
              <div
                css={{
                  color,
                  width: '40px',
                  textAlign: 'center',
                  fontSize: '50px',
                }}
              >
                {target.value}
              </div>
            </CSSTransition>
          );
        })}
      </div>
      <div
        css={{
          display: 'flex',
          paddingTop: '10px',
          fontSize: '20px',
        }}
      >
        {characters.split('').map(character => (
          <CSSTransition
            in={character in state.charStatsMatrix}
            timeout={300}
            key={character}
            classNames='node'
          >
            <div
              css={{
                color: theme.colors.muted,
                '& div': {
                  color:
                    character in state.charStatsMatrix
                      ? theme.colors.good
                      : theme.colors.muted,
                },
                '&.node-enter': {
                  '& div': {
                    transform: 'scale(5)',
                    opacity: 0,
                    color: theme.colors.new,
                  },
                },
                '&.node-enter-active': {
                  transition: 'all 300ms ease-in',
                  '& div': {
                    transform: 'scale(1)',
                    opacity: 1,
                    color: theme.colors.good,
                    transition: 'all 300ms ease-in',
                  },
                },
              }}
            >
              <div css={{ position: 'absolute' }}>{character}</div>
              {character}
            </div>
          </CSSTransition>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const theme = useTheme() as any;

  const [state, sendKey] = useList(characters);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      const { key, timeStamp } = event;
      sendKey(key, timeStamp);
    };
    window.addEventListener('keydown', keyDownHandler);
    return () => {
      window.removeEventListener('keydown', keyDownHandler);
    };
  }, [sendKey]);

  return (
    <>
      <Global
        styles={{
          html: { height: '100%' },
          '#root': { height: '100%' },
          body: {
            margin: '20px',
            fontFamily: 'Cantarell',
            padding: '10px',
            backgroundColor: theme.colors.background,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%239C92AC' fill-opacity='0.2' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          },
        }}
      />
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
        }}
      >
        <InfoZone state={state} />
        <LettersZone state={state} />
      </div>
    </>
  );
}
