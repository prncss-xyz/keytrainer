/** @jsxImportSource @emotion/react */

import useList from './components/list';
import { ratioThreshold } from './components/constants';
import { useTheme, Global } from '@emotion/react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

const characters = 'etisuranovpdzlbjkmxhywf';

function Pads({ amount }: { amount: number }) {
  const res = [];
  for (let i = 0; i < amount; ++i)
    res.push(<div key={i} css={{ width: '50px' }}></div>);
  return <>{res}</>;
}

function TypeZone() {
  const theme = useTheme() as any;

  const [state] = useList(characters);

  const errorRatio = state.cumulGood / (state.cumulGood + state.cumulBad) || 1;
  const mainTarget = state.targets[state.position];

  // characters per minute
  const cpm = (60000 * state.delay0) / state.delay1;

  return (
    <div
      css={{
        // fontFamily: 'Rubik',
        fontFamily: 'Cantarell',
        height: '100%',
        padding: '10px',
        backgroundColor: theme.colors.background,
      }}
    >
      <Global styles={{ backgroundColor: 'red' }} />
      <div
        css={{
          textColor: theme.colors.text,
        }}
      >
        <div
          css={{
            fontSize: '16px',
            display: 'flex',
            justifyContent: 'flex-end',
            color: theme.colors.muted,
            height: '100%',
            textAlign: 'right',
          }}
        >
          <table>
            <tr>
              <td css={{ textAlign: 'right' }}>correctness</td>
              <td
                css={{
                  fontWeight: 'normal',
                  width: '30px',
                  color:
                    errorRatio > ratioThreshold
                      ? theme.colors.good
                      : theme.colors.text,
                  textAlign: 'center',
                }}
              >
                {Math.round(errorRatio * 100)}
              </td>
              <td css={{ textAlign: 'left' }}>%</td>
            </tr>
            <tr>
              <td>speed</td>
              <td css={{ color: theme.colors.text, textAlign: 'center' }}>
                {Object.is(cpm, NaN) ? '\u2013' : Math.round(cpm)}
              </td>
              <td css={{ textAlign: 'left' }}>char / min</td>
            </tr>
          </table>
        </div>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            minHeight: '100%',
          }}
        >
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <TransitionGroup>
              <div
                css={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '150px',
                  borderBottomStyle: 'solid',
                  borderWidth: '1px',
                  paddingBottom: '10px',
                  borderColor: theme.colors.muted,
                  '& .character-exit': { opacity: 1 },
                  '& .character-exit-active': {
                    opacity: 0,
                    transition: 'opacity 1000ms ease-in',
                  },
                }}
              >
                <Pads amount={7 - state.targets.length} />
                {state.targets.map(target => {
                  let color = undefined;
                  if (target.index === mainTarget?.index) {
                    color = theme.colors.focus;
                    if (state.erroneous) color = theme.colors.error;
                  }
                  if (target.index < mainTarget?.index) {
                    color = theme.colors.muted;
                  }
                  if (target.firstTime) color = theme.colors.newLetter;
                  return (
                    <CSSTransition
                      key={target.index}
                      classNames='character'
                      timeout={5000}
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
            </TransitionGroup>
            <div
              css={{ display: 'flex', paddingTop: '10px', fontSize: '20px' }}
            >
              <div css={{ color: theme.colors.good }}>{state.activeChars}</div>
              <div css={{ color: theme.colors.muted }}>
                {state.backstoreCharacters}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className='App'>
      <TypeZone />
    </div>
  );
}
