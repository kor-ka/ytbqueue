import * as React from "react";
import { QueueSession, QueueContentLocal } from "./model/session";
import { QueueContent, Content } from "../../server/src/model/entity";
import { FlexLayout, Input, Button } from "./ui/ui";
import * as youtubeSearch from "youtube-search";
import { Player } from "./Host";
import { Prompt } from "./Prompt";
import { hashCode } from "./utils/hashcode";
import { Flipper, Flipped } from 'react-flip-toolkit';
import { htmlDecode } from "./utils/htmlDecode";

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Client extends React.PureComponent<{}, { playing?: QueueContent, queue: QueueContent[], inited: boolean, mode: 'queue' | 'search' }> {
    session = new QueueSession();

    constructor(props: any) {
        super(props);
        this.state = { queue: [], mode: 'queue', inited: false };
    }

    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        this.session.onQueueChange(q => this.setState({ queue: q.queue, inited: q.inited }))
        // fetch(endpoint + '/next/' + this.id, { method: 'POST' }).then();
    }

    toSearch = () => {
        this.setState({ mode: 'search' });
    }

    toQueue = () => {
        this.setState({ mode: 'queue' });
    }

    render() {
        return (
            <>
                <div style={{ display: this.state.mode === 'queue' ? undefined : 'none' }}>
                    {this.state.inited && <QueuePage toSearch={this.toSearch} playing={this.state.playing} queue={this.state.queue} session={this.session} />}
                    {!this.state.inited && <FlexLayout style={{ fontWeight: 900, fontSize: 30, width: '100%', height: '100%', color: '#fff', justifyContent: 'center', textAlign: 'center' }}>Connecting... 🙌</FlexLayout>}
                </div>
                {this.state.mode === 'search' && <Searcher toQueue={this.toQueue} session={this.session} />}
            </>
        )
    }
}

export class QueuePage extends React.PureComponent<{ playing?: QueueContent, queue: QueueContent[], session: QueueSession, toSearch: () => void }> {
    toSearch = () => {
        this.props.toSearch();
    }

    render() {
        return (
            <>
                <Button onClick={this.toSearch} style={{ position: 'fixed', zIndex: 300, bottom: 0, left: 0, right: 0, borderRadius: 0, backgroundColor: '#000', alignSelf: 'stretch', fontSize: 30, fontWeight: 900, color: "#fff" }}>Add something cool 😎</Button>
                <div style={{ position: 'fixed', width: '100%', height: '100%', zIndex: -1, backgroundColor: 'rgba(249,249,249,1)' }} />

                <FlexLayout divider={0} style={{ flexDirection: 'column', paddingBottom: 100, alignItems: 'stretch', marginTop: 0, width: '100%', overflowX: 'hidden' }}>
                    <div style={{ marginBottom: -5 }}>
                        <Prompt />
                    </div>
                    {this.props.playing && <PlayingContent session={this.props.session} playing={this.props.playing} />}
                    {!this.props.playing && (
                        <>
                            <FlexLayout style={{ backgroundColor: '#000', height: 200, alignSelf: 'stretch', color: '#fff', fontWeight: 900, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} >
                                {this.props.queue.length === 0 && 'No music to play 🤷‍♂️'}
                                {this.props.queue.length === 0 && <Button onClick={this.toSearch} style={{ border: '5px solid #fff', marginTop: 15, fontSize: 30, fontWeight: 900, color: "#fff", backgroundColor: '#000' }}>Start party 🎉</Button>}
                            </FlexLayout>
                        </>
                    )}
                    <Queue queue={this.props.queue} session={this.props.session} />

                </FlexLayout>
            </>
        );
    }
}

class PlayingContent extends React.PureComponent<{ session: QueueSession, playing: QueueContent }>{
    onVoteUp = () => {
        this.props.session.vote(this.props.playing.queueId, true);
    }
    onVoteDown = () => {
        this.props.session.vote(this.props.playing.queueId, false);
    }
    onSkip = () => {
        this.props.session.skip(this.props.playing.queueId);
    }
    render() {
        let ups = 0;
        let downs = 0;
        let meUp = false;
        let meDown = false;
        this.props.playing.votes.map(v => {
            console.warn(v.user, this.props.session.clientId);
            if (v.up) {
                ups++;
                meUp = meUp || (v.user.id === this.props.session.clientId);
            } else {
                downs++;
                meDown = meDown || (v.user.id === this.props.session.clientId);
            }

        });
        return (
            <FlexLayout style={{ position: 'relative' }}>

                <Player height={200} id={this.props.playing.id} />
                {/* <FlexLayout style={{ position: 'absolute', flexDirection: 'row', left: 20, bottom: 20, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20 }}>
                    {!this.props.playing.historical && <Button onClick={this.onVoteUp} style={{ backgroundColor: 'transparent', height: 20, textAlign: 'right' }}><span style={{ color: meUp ? 'green' : 'black', marginTop: 1 }}>{ups}</span>🤘</Button>}
                    {!this.props.playing.canSkip && <Button onClick={this.onVoteDown} style={{ backgroundColor: 'transparent', height: 20, textAlign: 'right' }}><span style={{ color: meDown ? 'red' : 'black', marginTop: 1 }}>{downs}</span>👎</Button>}
                    {this.props.playing.canSkip && <Button onClick={this.onSkip} style={{ backgroundColor: 'transparent', height: 20, textAlign: 'right' }}>⏭</Button>}
                </FlexLayout> */}
            </FlexLayout>
        );
    }
}

export class Queue extends React.PureComponent<{ queue: QueueContentLocal[], session: QueueSession }> {
    onAppear(el, i) {
        setTimeout(() => {
            el.classList.add("fadeIn");
            setTimeout(() => {
                el.style.opacity = 1;
                el.classList.remove("fadeIn");
            }, 500);
        }, i * 50);
    }

    onExit(el, i, removeElement) {
        setTimeout(() => {
            el.classList.add("slideOut");
            setTimeout(removeElement, 500);
        }, i * 50);
    }

    render() {
        console.warn(this.props.queue.map(i => i.queueId).join('-'));
        return (
            <FlexLayout divider={0} style={{ flexGrow: 1, flexDirection: 'column' }}>
                <Flipper flipKey={this.props.queue.map(i => i.queueId).join('-')}>
                    {this.props.queue.map(c => (
                        <Flipped onAppear={this.onAppear} onExit={this.onExit} key={c.queueId} flipId={c.queueId}>
                            <div>
                                <QueueItem key={c.queueId} content={c} session={this.props.session} />
                            </div>
                        </Flipped>
                    ))}
                </Flipper>
            </FlexLayout>
        );
    }
}

let geners = ['Rock', 'Alternative', 'Classical', 'Jazz', 'Blues', 'Hip-Hop', 'Dance', 'Folk', 'Soul', 'Country', 'Pop', 'Grunge', 'Reggae', 'New Wave', 'Hardcore', 'Opera', 'House', 'Techno', 'Drum and Bass', 'Disco', 'Ambient',]
let colors = [
    { name: 'Blue', color: '#0074D9' },
    { name: 'Green', color: '#2ECC40' },
    { name: 'Lime', color: '#01FF70' },
    { name: 'Orange', color: '#FF851B' },
    { name: 'Red', color: '#FF4136' },
    { name: 'Maroon', color: '#85144b' },
    { name: 'Fuchsia', color: '#F012BE' },
    { name: 'Yellow', color: '#FFDC00' },
    { name: 'Olive', color: '#3D9970' },
]
class QueueItem extends React.PureComponent<{ content: QueueContentLocal, session: QueueSession, }>{
    onVoteUp = () => {
        this.props.session.vote(this.props.content.queueId, true);
    }
    onVoteDown = () => {
        this.props.session.vote(this.props.content.queueId, false);
    }
    onSkip = () => {
        this.props.session.skip(this.props.content.queueId);
    }
    render() {
        let ups = 0;
        let downs = 0;
        let meUp = false;
        let meDown = false;
        this.props.content.votes.map(v => {
            if (v.up) {
                ups++;
                meUp = meUp || (v.user.id === this.props.session.clientId);
            } else {
                downs++;
                meDown = meDown || (v.user.id === this.props.session.clientId);
            }

        });
        let userId = this.props.content.user.id;
        let isYou = userId === this.props.session.clientId;
        let color = colors[Math.abs(hashCode(userId)) % colors.length];
        let name = color.name + ' ' + geners[Math.abs(hashCode(userId)) % geners.length] + (isYou ? ' (You)' : '');
        return (
            <FlexLayout style={{ position: 'relative', flexDirection: 'row', backgroundColor: this.props.content.playing ? 'black' : undefined, color: this.props.content.playing ? 'white' : undefined }}>
                <ContentItem content={this.props.content} progress={this.props.content.progress} poster={!this.props.content.playing} subtitle={name} subtitleColor={color.color} />
                <FlexLayout style={{ flexDirection: 'column', zIndex: 100, position: 'absolute', top: 4, right: 0 }} divider={4}>
                    {!this.props.content.historical && <Button onClick={this.onVoteUp} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><span style={{ color: meUp ? 'green' : 'black', marginTop: 1 }}>{ups ? ups : ''}</span>🤘</Button>}
                    {!this.props.content.canSkip && <Button onClick={this.onVoteDown} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><span style={{ color: meDown ? 'red' : 'black', marginTop: 1 }}>{downs ? downs : ''}</span>👎</Button>}
                    {this.props.content.canSkip && <Button onClick={this.onSkip} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}>⏭</Button>}
                </FlexLayout>
            </FlexLayout>
        );
    }
}

export class Searcher extends React.PureComponent<{ session: QueueSession, toQueue: () => void }, { q: string, results: Content[] }>{
    constructor(props: any) {
        super(props);
        this.state = { q: '', results: [] };
    }
    generation = 0;

    toQueue = () => {
        this.props.toQueue();
    }


    onInputChange = (event: React.FormEvent<HTMLInputElement>) => {
        let q = event.currentTarget.value;
        if (q) {
            this.setState({ q })

            if (q.includes('youtu.be')) {
                // direct link
                let split = q.split('/');
                let id = split[split.length - 1];
                this.setState({ results: [{ title: 'direct', id, subtitle: 'link' }] })

            } else {
                // search
                var opts: youtubeSearch.YouTubeSearchOptions = {
                    maxResults: 20,
                    type: 'video',
                    videoEmbeddable: 'true',
                    key: "AIzaSyDD0svyIgbg6lrE1310ma1mpiw2g3vomnc"
                    // key: "AIzaSyBW-5ayHQTRcrELnx5gKJcjJc16qn2wlfk"
                    // key: "AIzaSyBFnDOcWBoMBCLGUjoC0znC0GwN2WlnD8Y"


                };

                let g = ++this.generation;
                setTimeout(() => {
                    if (g !== this.generation) {
                        return;
                    }
                    youtubeSearch(q, opts, (err, results) => {
                        if (!err && g === this.generation) {
                            this.setState({ results: results.map(r => ({ title: r.title, id: r.id, subtitle: r.description, thumb: r.thumbnails.medium })) })
                        }
                    });
                }, 300)
            }

        } else {
            this.setState({ q: '', results: [] })
        }
    }

    onSelect = (conent: Content) => {
        this.setState({ q: '', results: [] })
        this.props.session.add(conent);
        this.props.toQueue();
    }

    render() {
        return (
            <FlexLayout style={{ flexDirection: 'column', alignItems: 'stretch', height: '100%', overflowY: 'hidden', backgroundColor: 'rgba(249,249,249,1)' }}>
                <FlexLayout style={{ flexDirection: 'row' }}>
                    <Button onClick={this.toQueue} style={{ width: 1, backgroundColor: 'transparent', position: 'absolute', marginTop: 16, marginLeft: 14, zIndex: 200 }}>👈</Button>
                    <Input placeholder="search from some awesome music 😜" autoFocus={true} style={{ flexGrow: 1, flexShrink: 0, backgroundColor: '#fff', height: 40, borderRadius: 10, margin: 20, padding: 10, zIndex: 100, paddingLeft: 40 }} value={this.state.q} onChange={this.onInputChange} />
                </FlexLayout>
                <FlexLayout style={{ flexDirection: 'column', overflowY: 'scroll', flexGrow: 1, height: 1, marginTop: -80, paddingTop: 80 }}>
                    {this.state.q && this.state.results.map(r => (
                        <FlexLayout onClick={() => this.onSelect(r)}>
                            <ContentItem content={{ id: r.id, title: r.title, thumb: r.thumb }} subtitle={r.subtitle} subtitleColor="dddddd" />
                        </FlexLayout>
                    ))}
                </FlexLayout>

            </FlexLayout>
        );
    }
}

class ContentItem extends React.PureComponent<{
    content: Content,
    subtitle?: string,
    subtitleColor?: string,
    poster?: boolean,
    progress?: number,
    subtitleCallback?: () => void
}>{
    render() {
        let scale = 1;
        let width = 80;
        let initialWidth = width;
        let height = 55;
        let initialHeight = height;
        if (this.props.content.thumb) {
            let th = this.props.content.thumb.height || 240;
            let tw = this.props.content.thumb.width || 240;

            scale = tw > th ? width / tw : height / th;
            width = tw * scale;
            height = th * scale;

        }
        let poster = this.props.poster !== false;
        return (
            <FlexLayout style={{ flexDirection: 'row', marginLeft: 20, marginRight: 20, paddingTop: 10, paddingBottom: 10, maxWidth: 'calc(100% - 160px)', zIndex: 0 }}>
                {this.props.progress !== undefined &&
                    <div style={{
                        background: `repeating-linear-gradient(
                                    45deg,
                                    #222,
                                    #222 10px,
                                    #000 10px,
                                    #000 20px
                                )`,
                        position: 'absolute',
                        width: 100 * this.props.progress + '%',
                        height: '100%',
                        zIndex: -1,
                        marginTop: -10,
                        marginLeft: -20,
                        marginRight: -20
                    }} />}
                {poster && <FlexLayout style={{ justifyContent: 'center', alignItems: 'center', width: initialWidth, height: initialHeight }}>
                    {this.props.content.thumb && <img src={this.props.content.thumb.url} width={width} height={height} />}
                </FlexLayout>}
                <FlexLayout style={{ flexGrow: 1, maxWidth: '100%', flexDirection: 'column' }} divider={0}>
                    <FlexLayout style={{ minHeight: 35 }}>
                        <span style={{ fontWeight: 500, WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineClamp: 3 }}>{htmlDecode(this.props.content.title)}</span>
                    </FlexLayout>
                    <FlexLayout style={{ justifyContent: 'flex-end' }}>
                        {this.props.subtitle && <span onClick={this.props.subtitleCallback} style={{ fontWeight: 500, color: this.props.subtitleColor, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineClamp: 1 }}>{htmlDecode(this.props.subtitle)}</span>}
                    </FlexLayout>
                </FlexLayout>
            </FlexLayout>
        );
    }
}
