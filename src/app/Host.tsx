import * as React from "react";
import { QueueSession, QueueContentLocal } from "./model/session";
import { QueueContent } from "../../server/src/model/entity";
import YouTube from "react-youtube";
import { FlexLayout, Button } from "./ui/ui";
import { default as Twemoji } from 'react-twemoji';
import FlipMove from "react-flip-move";
import { QueueItem, ContentItem } from "./Client";
import { Arrow } from "./ui/icons";

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

                {this.state.playing &&
                    <FlexLayout style={{ flexDirection: 'row', height: '100%', justifyContent: 'stretch', alignItems: 'stretch', backgroundColor: 'black' }} divider={0}>
                        <Player onEnd={this.onEnd} current={this.state.playing ? this.state.playing.current : undefined} onProgress={this.onProgress} id={this.state.playing.id} autoplay={true} width="100%" height="100%" />
                        <Queue q={this.state.q.queue || []} session={this.session} />
                    </FlexLayout>
                }
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
                                <Twemoji >{window.location.host.replace('www.', '')}/{this.session.id.toLocaleLowerCase() + ' '}</Twemoji>
                            </FlexLayout>}
                    </FlexLayout>
                )
                }

            </>
        );

    }
}

interface Animation {
    from: Partial<CSSStyleDeclaration>;
    to: Partial<CSSStyleDeclaration>;
}
class Queue extends React.PureComponent<{ q: QueueContentLocal[], session: QueueSession }, { show: boolean }>{
    constructor(props: any) {
        super(props);
        this.state = { show: true };
    }
    leaveAnimation: Animation = {
        from: { transform: 'translate(0, 0)', opacity: '1' },
        to: { transform: 'translate(0, -100%)', opacity: '0' },
    }

    toggleShow = () => {
        this.setState({ show: !this.state.show })
    }

    render() {
        return (
            <>
                <FlexLayout style={{ flexDirection: 'column', backgroundColor: '#000', height: '100%', overflowX: 'hidden' }} divider={0}>
                    <FlexLayout divider={0} style={{ height: 'calc(100% - 100px)', transition: 'width 0.3s ease-in-out', width: this.state.show ? 400 : 0.1, flexDirection: 'column', paddingTop: 80 }}>
                        <FlexLayout style={{ flexDirection: 'row', color: 'rgba(255,255,255, 0.5)', borderBottom: '1px solid rgba(255,255,255, 0.4)', paddingLeft: 17, fontSize: 22, paddingBottom: 11 }}>
                            <FlexLayout >Playlist</FlexLayout>
                            <a href={'/new'} style={{ color: 'rgba(255,255,255, 0.5)', textDecoration: 'none', marginLeft: 4, marginBottom: -2, fontSize: 15, border: '1px solid rgba(255,255,255, 0.5)', borderRadius: 10, paddingTop: 4, paddingLeft: 7, paddingRight: 8, fontWeight: 300 }}>+ New </a>
                        </FlexLayout>

                        <FlexLayout style={{ height: 'calc(100% - 20px)', overflowY: 'hidden' }} divider={0}>
                            <FlexLayout style={{ marginTop: 17 }} />
                            <FlipMove leaveAnimation={this.leaveAnimation}>
                                {this.props.q.reduce((res, content, i, data) => {
                                    let prev = data[i - 1];
                                    if (prev && !prev.historical && content.historical) {
                                        res.push('Next up')
                                    }
                                    res.push(content);
                                    return res;
                                }, [] as (QueueContentLocal | string)[]).map(c => {
                                    if (typeof c === 'string') {

                                        return <FlexLayout key="separetor" style={{ flexGrow: 1, color: '#fff', justifyContent: 'center', alignItems: 'center', opacity: 0.5, fontSize: 20, height: 100 }}>
                                            <div>{c}</div>
                                        </FlexLayout>

                                    } else {
                                        return <QueueItem maxWidth={'280px'} key={c.queueId} content={c} session={this.props.session} style={{ progress1: '#111', progress2: '#222', textColor: 'white' }} />

                                    }
                                })}

                            </FlipMove>
                        </FlexLayout>
                    </FlexLayout>
                    <FlexLayout style={{ height: 90, width: 0 }} divider={0} />

                </FlexLayout>

                <FlexLayout onClick={this.toggleShow} style={{ height: 50, width: 50, transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out', transform: this.state.show ? 'rotate(180deg) scale(1,1)' : 'rotate(0deg) scale(2,2)', opacity: this.state.show ? 1 : 0.3, position: 'fixed', top: 65, right: 20, zIndex: 1000, alignItems: 'center', justifyContent: 'center' }}>
                    <Arrow />
                </FlexLayout>
                <Link sessionId={this.props.session.id} queueShown={this.state.show} />

            </>

        )
    }
}


class Link extends React.PureComponent<{ sessionId: string, queueShown: boolean }, { show: boolean }>{
    constructor(props: { sessionId: string, queueShown: boolean }) {
        super(props);
        let show = window.localStorage.getItem('show_link' + props.sessionId) === 'true';
        this.state = { show };
    }
    onClick = () => {
        let show = !this.state.show;
        this.setState({ show });
        window.localStorage.setItem('show_link' + this.props.sessionId, show ? 'true' : 'false');

    }
    render() {
        let show = this.props.queueShown || this.state.show;
        return (
            <FlexLayout
                onClick={this.onClick}
                divider={0}
                style={
                    {
                        overflow: 'hidden',
                        position: 'fixed',
                        bottom: 20, right: 50,
                        height: 50,

                        alignItems: 'center',
                        justifyContent: 'center',

                        width: show ? 250 : 50,
                        opacity: this.props.queueShown ? 1 : 0.4,
                        transition: 'width 0.3s, opacity 0.3s',

                        backgroundColor: '#000',

                        borderRadius: 30,

                        fontWeight: 200,
                        color: "#fff",
                        fontSize: 25,
                        paddingBottom: 2



                    }}>
                {!show && <Twemoji >🔗</Twemoji>}
                {/* {show && window.location.host.replace('www.', '') + '/' + this.props.sessionId.toLocaleLowerCase()} */}
                {show && 'wopwop.app' + '/' + this.props.sessionId.toLocaleLowerCase()}
            </FlexLayout>

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
            <div style={{ width: this.props.width || window.innerWidth, height: this.props.height, position: 'relative', flexGrow: 1 }}>
                {/* <iframe frameBorder={0} style={{ position: 'absolute', width: '100%', height: '100%' }} src={`https://www.youtube.com/embed/${this.props.id}?showinfo=0&rel=0&controls=1&mute=0&autoplay=0&enablejsapi=1&origin=http%3A%2F%2Flocalhost%3A8080&widgetid=1`} /> */}
                <YouTube
                    id={"ytb_frame"}
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
