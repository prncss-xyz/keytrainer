/** @jsxImportSource @emotion/react */

import useList from './components/list';

function TypeZone() {
  const [state] = useList('etisuranovpdzlbjkmxhyhwf');

  const errorRatio = state.cumulGood / (state.cumulGood + state.cumulBad);
  const mainTarget = state.targets[state.position];

  // characters per minute
  const cpm = (60000 * state.delay0) / state.delay1;
  const mean1 = state.delay1 / state.delay0;
  const mean2 = state.delay2 / state.delay0;
  const variance = mean2 - mean1 * mean1;
  const eqType = Math.sqrt(variance);

  return (
    <>
      <div>
        Correctness:
        {Object.is(errorRatio, NaN) ? 100 : Math.round(errorRatio * 100)}%
      </div>
      <div>
        Speed: {Object.is(cpm, NaN) ? '--' : Math.round(cpm)} +-{' '}
        {Object.is(eqType, NaN) ? '--' : Math.round(eqType)} characters / minute
      </div>
      <div
        css={{
          display: 'flex',
        }}
      >
        <div
          css={{
            display: 'flex',
            width: '200px',
            justifyContent: 'flex-end',
          }}
        >
          {state.targets.map(target =>
            target.index < mainTarget?.index ? (
              <div
                css={{
                  color: 'grey',
                }}
                key={target.index}
              >
                {target.value}
              </div>
            ) : null,
          )}
        </div>
        <div
          css={{
            display: 'flex',
            color: state.erroneous
              ? 'red'
              : mainTarget?.firstTime
              ? 'purple'
              : 'blue',
            width: '40px',
            justifyContent: 'space-around',
          }}
        >
          {mainTarget?.value}
        </div>
        <div css={{ display: 'flex' }}>
          {state.targets.map(target =>
            target.index > mainTarget?.index ? (
              <div
                css={{ color: target.firstTime ? 'purple' : 'black' }}
                key={target.index}
              >
                {target.value}
              </div>
            ) : null,
          )}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <div css={{ fontSize: '40px' }} className='App'>
      <TypeZone />
    </div>
  );
}
