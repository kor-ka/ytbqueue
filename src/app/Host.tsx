import * as React from "react";
import { QueueSession } from "./model/session";
import { QueueContent } from "../../server/src/model/entity";
import YouTube from "react-youtube";
import { FlexLayout, Button } from "./ui/ui";
import { default as Twemoji } from 'react-twemoji';

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Host extends React.PureComponent<{}, { playing?: QueueContent, q?: { queue: QueueContent[], inited: boolean } }> {
    session = new QueueSession();

    constructor(props: any) {
        super(props);

        this.state = {};
    }


    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        this.session.onQueueChange(q => this.setState({ q: q }))
        // fetch(endpoint + '/next/' + this.id, { method: 'POST' }).then();
    }

    onEnd = () => {
        if (this.state.playing) {
            this.session.next(this.state.playing.queueId);
        }
    }

    onProgress = (current: number, duration: number) => {
        if (this.state.playing) {
            this.session.progress(this.state.playing.queueId, current, duration);

        }
    }
    render() {
        return (
            <>
                {/* 
                {!this.state.playing && ((window as any).chrome || navigator.userAgent.toLowerCase().includes('safari')) && (
                    <div style={{ position: 'fixed', opacity: 0.4, zIndex: -1, top: 0, left: 0, width: '100%', height: '100%' }}>
                        <svg className="hue" height="100%" width="100%">
                            <defs>
                                <filter id="f1" x="10%" y="10%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="300" />
                                </filter>
                            </defs>
                            <g filter="url(#f1)" height="100%" width="100%">
                                <circle cx="0" cy="0" r="75%" fill="#0074D9" />
                                <circle cx="0%" cy="100%" r="75%" fill="#FFDC00" />
                                <circle cx="100%" cy="100%" r="75%" fill="#7FDBFF" />
                                <circle cx="100%" cy="0%" r="75%" fill="#01FF70" />
                            </g>
                        </svg>

                    </div>
                )} */}

                {this.state.playing && <Player key={this.state.playing.queueId} onEnd={this.onEnd} current={this.state.playing ? this.state.playing.current : undefined} onProgress={this.onProgress} id={this.state.playing.id} autoplay={true} width="100%" height="100%" />}
                {!this.state.playing && (
                    <FlexLayout style={{ height: '100%', flex: 1, fontSize: '5vmin', alignSelf: 'stretch', opacity: 0.8, color: '#000', fontWeight: 100, alignItems: 'center', justifyContent: 'center', textAlign: 'center', }} >
                        < Twemoji >{(this.state.q && this.state.q.inited) ? (this.state.q.queue.length === 0 ? (
                            <>
                                <span style={{ color: '#555', position: 'absolute', fontSize: '5vmin', top: '10vmin', width: '100%', left: 0 }}>Collective playlists service</span>

                                <span>To start open this link on your phone</span>
                            </>
                        ) : '') : 'Connecting... 🙌'}</Twemoji>
                        {this.state.q && this.state.q.queue.length === 0 &&
                            <FlexLayout style={{ border: '0.2vmin solid #000', marginTop: '3vmin', borderRadius: '2vmin', padding: '0.3vmin', paddingBottom: '1vmin', paddingLeft: '2vmin', paddingRight: '2vmin', fontSize: '5vmin', fontWeight: 100, color: "#000", }}>
                                <Twemoji>{window.location.host.replace('www.', '')}/{this.session.id.toLocaleLowerCase() + ' '}</Twemoji>
                            </FlexLayout>}
                    </FlexLayout>
                )
                }
                {this.state.playing && (
                    <WaterMark sessionId={this.session.id} />
                )}

            </>
        );

    }
}


class WaterMark extends React.PureComponent<{ sessionId: string }, { hidden?: boolean }>{
    constructor(props: { sessionId: string }) {
        super(props);
        let hidden = window.localStorage.getItem('host_locked_' + props.sessionId) === 'true';
        this.state = { hidden };
    }
    onClick = () => {
        let hidden = !this.state.hidden;
        this.setState({ hidden });
        window.localStorage.setItem('host_locked_' + this.props.sessionId, hidden ? 'true' : 'false');

    }
    render() {
        return (
            <FlexLayout onClick={this.onClick} style={{ position: 'absolute', bottom: 20, left: 20, opacity: 0.4 }}>
                <Button style={{ fontWeight: 900, color: "#fff", backgroundColor: '#000', fontSize: '4vmin' }}>
                    {!this.state.hidden && <Twemoji >📱{window.location.host.replace('www.', '')}/<span style={{ color: '#7FDBFF' }}>{this.props.sessionId + ' '}</span></Twemoji>}
                    {this.state.hidden && < Twemoji >🔒</Twemoji>}
                </Button>
            </FlexLayout >
        );
    }
}

export class Player extends React.PureComponent<{ id: string, current?: number, width?: number | string, height?: number | string, onEnd?: () => void, onProgress?: (current: number, durarion: number) => void, autoplay?: boolean, mute?: boolean }, { width: number | string, height: number | string }>{
    constructor(props: any) {
        super(props);
        this.state = { width: 1, height: 2 };
    }

    mounted = false;
    playerInner?: any;
    timeout?: any;
    updateDimensions = () => {
        this.setState({ width: window.innerWidth, height: window.innerHeight });
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions);
        this.mounted = false;
    }
    componentDidMount() {
        window.addEventListener("resize", this.updateDimensions);
        this.mounted = true;
    }


    _onReady = (event) => {
        // access to player in all event handlers via event.target
        if (this.props.autoplay) {
            if (this.props.current) {
                event.target.seekTo(this.props.current);
            }
            event.target.playVideo();
        }
    }
    onChange = (event: { target: { getCurrentTime: () => any, seekTo: (time: number) => void }, data: number }) => {
        console.warn(event);
        this.playerInner = event.target;
        this.checkTime();
    }
    checkTime = () => {
        this.timeout = window.setTimeout(() => {
            if (!this.mounted) {
                return;
            }
            if (this.playerInner && this.props.onProgress) {
                this.props.onProgress(this.playerInner.getCurrentTime(), this.playerInner.getDuration())
            }
            this.checkTime();
        }, 5000)

    }
    onEnd = () => {
        if (this.props.onEnd) {
            this.props.onEnd();
        }
    }
    render() {
        return (
            <div style={{ width: this.props.width || window.innerWidth, height: this.props.height || window.innerHeight }}>
                {/* <iframe frameBorder={0} style={{ position: 'absolute', width: '100%', height: '100%' }} src={`https://www.youtube.com/embed/${this.props.id}?showinfo=0&rel=0&controls=1&mute=0&autoplay=0&enablejsapi=1&origin=http%3A%2F%2Flocalhost%3A8080&widgetid=1`} /> */}
                <YouTube

                    onReady={this._onReady}
                    videoId={this.props.id}
                    onStateChange={this.onChange}
                    opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: {
                            showinfo: 0,
                            rel: 0,
                            controls: 0,
                            mute: this.props.mute ? 1 : 0,
                            autoplay: this.props.autoplay ? 1 : 0,
                        } as any,
                    }}
                    onEnd={this.onEnd}
                    onError={this.onEnd}
                />
            </div>
        );
    }
}
