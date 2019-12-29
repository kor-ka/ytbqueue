import * as React from "react";
import * as ReactDOM from "react-dom";
import { QueueSession, QueueContentLocal } from "./model/session";
import { QueueContent, Content } from "../../server/src/model/entity";
import { FlexLayout, Input, Button } from "./ui/ui";
import { Player } from "./Host";
import FlipMove from "react-flip-move";
import { Prompt } from "./Prompt";
import { hashCode } from "./utils/hashcode";
import { htmlDecode } from "./utils/htmlDecode";
import { Skip, Clear } from "./ui/icons";

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
                    {!this.state.inited && <FlexLayout style={{ fontWeight: 300, fontSize: 30, width: '100%', height: '100%', color: '#000', justifyContent: 'center', textAlign: 'center' }}>Connecting... 🙌</FlexLayout>}
                </div>
                {this.state.mode === 'search' && <Searcher onClear={this.toQueue} session={this.session} />}
                {/* <Searcher toQueue={this.toQueue} session={this.session} /> */}

            </>
        )
    }
}

class NoHostPrompt extends React.PureComponent<{ session: QueueSession }, { copied: boolean, show: boolean }> {
    input?: any;
    timer?: any;

    constructor(props: { session: QueueSession }) {
        super(props);
        props.session.onNoHost(nh => this.setState({ show: nh }))
    }


    copy = () => {
        console.warn(this.input);
        if (this.input) {
            var oldContentEditable = this.input.contentEditable,
                oldReadOnly = this.input.readOnly,
                range = document.createRange();

            this.input.contentEditable = true;
            this.input.readOnly = false;
            range.selectNodeContents(this.input);

            var s = window.getSelection();
            s.removeAllRanges();
            s.addRange(range);

            this.input.setSelectionRange(0, 999999); // A big number, to cover anything that could be inside the element.

            this.input.contentEditable = oldContentEditable;
            this.input.readOnly = oldReadOnly;

            document.execCommand('copy');
        }

        document.execCommand('copy');
        this.setState({
            copied: true,
        });

        this.timer = setTimeout(() => {
            this.setState({
                copied: false,
            });
        }, 1500);
    };

    handleInputRef = (ref) => this.input = ref;

    render() {

        return !!this.state && this.state.show && <FlexLayout style={{ position: 'fixed', zIndex: 300, fontSize: '5.9vmin', width: '100%', backgroundColor: 'white', bottom: 0, padding: '4vmin', borderTop: '1px solid black', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <FlexLayout>To play this list open this link on PC </FlexLayout>
            <FlexLayout style={{ flexDirection: 'row', flexGrow: 1, alignItems: 'center', alignSelf: 'stretch' }}>
                <FlexLayout style={{ fontSize: '5.9vmin', marginBottom: '-0.6vmin', marginRight: '5vmin' }} >{window.location.host.replace('www.', '') + '/' + this.props.session.id.toLocaleLowerCase()}</FlexLayout>
                <Input innerRef={this.handleInputRef} value={window.location.host.replace('www.', '') + '/' + this.props.session.id.toLocaleLowerCase()} style={{ position: 'absolute', bottom: -10000 }} />
                <Button onClick={this.copy} style={{ fontSize: '5.9vmin', border: '1px solid black', width: '30vmin' }}>{this.state && this.state.copied ? 'Copied' : 'Copy link'}</Button>
            </FlexLayout>
        </FlexLayout>
    }
}

export class ConnectingPrompt extends React.PureComponent<{ session: QueueSession }, { show: boolean }> {
    constructor(props: { session: QueueSession }) {
        super(props);
        this.state = { show: false };
        props.session.onConnectedChange(connected => this.setState({ show: !connected }))
    }

    render() {
        return this.state.show && <FlexLayout style={{ position: 'fixed', zIndex: 300, fontSize: '5.9vmin', width: '100%', backgroundColor: 'white', bottom: 0, padding: '4vmin', borderTop: '1px solid black', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <FlexLayout> Connecting... </FlexLayout>
        </FlexLayout>
    }
}

export class QueuePage extends React.PureComponent<{ playing?: QueueContent, queue: QueueContent[], session: QueueSession, toSearch: () => void }> {
    toSearch = () => {
        this.props.toSearch();
    }

    render() {
        return (
            <>
                {/* {this.props.queue.length !== 0 &&
                    <Button onClick={this.toSearch} style={{ position: 'fixed', zIndex: 300, bottom: 0, left: 0, right: 0, borderRadius: 0, alignSelf: 'stretch', fontSize: 30, fontWeight: 200, color: "#000" }}>Add video</Button>
                } */}
                {/* <Searcher onClear={() => { }} session={this.props.session} /> */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 2000 }}>
                    <Prompt />
                </div>

                <QueueSearch queue={this.props.queue} session={this.props.session} />
                {/* {this.props.playing && <PlayingContent session={this.props.session} playing={this.props.playing} />} */}

                {/* <FlexLayout divider={0} style={{ flexDirection: 'column', paddingBottom: 100, alignItems: 'stretch', marginTop: 0, width: '100%', overflowX: 'hidden' }}>


                </FlexLayout> */}

                {this.props.queue.length !== 0 && <NoHostPrompt session={this.props.session} />}
                <ConnectingPrompt session={this.props.session} />
            </>
        );
    }
}

interface Animation {
    from: Partial<CSSStyleDeclaration>;
    to: Partial<CSSStyleDeclaration>;
}


export class PreviewModal extends React.PureComponent<{ id: string, close: () => void, show?: boolean }>{
    render() {
        return <FlexLayout
            style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                background: 'black',
                width: '100%',
                zIndex: 1001,
                justifyContent: 'center',
                pointerEvents: this.props.show ? undefined : 'none',
                opacity: this.props.show ? 1 : 0,
                transition: 'opacity .15s ease-in-out'
            }}
            onClick={this.props.close}
        >
            <FlexLayout style={{ top: 15, right: 15, position: 'absolute' }} ><Clear color="#999" /></FlexLayout>
            <FlexLayout style={{ height: 200, position: 'relative' }} >
                <FlexLayout style={{ position: 'absolute', color: 'white', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}> <div>Loading...</div> </FlexLayout>
                <Player id={this.props.show ? this.props.id : undefined} height={200} width="100%" />
            </FlexLayout>
        </FlexLayout>
    }
}

export class QueueSearch extends React.PureComponent<{ queue: QueueContentLocal[], session: QueueSession }, { q: string, results: Content[], searching: boolean, preview?: string }> {

    playingRef = React.createRef<QueueItem>();
    playingBackground = React.createRef<HTMLDivElement>();

    leaveAnimation: Animation = {
        from: { transform: 'translate(0, 0)', opacity: '1' },
        to: { transform: 'translate(0, -100%)', opacity: '0' },
    }

    constructor(props: any) {
        super(props);
        this.state = { q: '', results: [], searching: false };
    }
    generation = 0;

    onInputChange = (event: React.FormEvent<HTMLInputElement>) => {
        let q = event.currentTarget.value;
        if (q) {
            this.setState({ q, searching: true, results: [] })

            if (q.includes('youtu.be')) {
                // direct link
                let split = q.split('/');
                let id = split[split.length - 1];
                this.setState({ results: [{ title: 'direct', id, subtitle: 'link' }] })

            } else {

                let g = ++this.generation;
                setTimeout(() => {
                    if (g !== this.generation) {
                        return;
                    }
                    let endpoint = 'https://api.cognitive.microsoft.com/bing/v7.0/videos/search?';
                    let query = 'q=' + q.replace(' ', '+').trim() + '+site:youtube.com' + '&count=100' + '&embedded=player' + '&market=ru-ru';
                    fetch(endpoint + query, { headers: [['Ocp-Apim-Subscription-Key', 'e56b32ef31084eadbc238947215b1d53']] }).then(async res => {
                        if (g === this.generation) {
                            this.setState({
                                results: (await res.json()).value.map(r => {
                                    let contentUrlSplit = r.contentUrl.split('v=');
                                    let id = contentUrlSplit[contentUrlSplit.length - 1];
                                    let thumb = {
                                        url: r.thumbnailUrl,
                                        width: r.thumbnail.width,
                                        height: r.thumbnail.height,
                                    }
                                    return ({ id, title: r.name, subtitle: r.description, thumb });
                                }),
                                searching: false
                            })
                        } else {

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
    }

    onClear = () => {
        ++this.generation
        this.setState({ q: '', results: [] })
    }

    setPreview = (preview: string) => {
        this.setState({ preview });
    }

    render() {
        let input = (
            <FlexLayout style={{ flexDirection: 'row', width: '100%', position: 'fixed', zIndex: 1001 }}>
                {!!this.state.q && <FlexLayout onClick={this.onClear} style={{ height: 40, width: 40, position: 'absolute', right: 10, zIndex: 200, justifyContent: 'center', marginTop: 20 }} >
                    <Clear />
                </FlexLayout>}

                <Input placeholder="search music" autoFocus={true} style={{ flexGrow: 1, flexShrink: 0, backgroundColor: '#fff', border: '1px solid black', height: 40, borderRadius: 10, margin: 20, paddingTop: 9, paddingBottom: 11, zIndex: 100, paddingLeft: 16 }} value={this.state.q} onChange={this.onInputChange} />
            </FlexLayout>
        );

        let queue = (
            <FlexLayout divider={0} style={{ flexGrow: 1, position: 'relative', flexDirection: 'column', paddingTop: 80 }}>
                <FlipMove leaveAnimation={this.leaveAnimation}>
                    {this.props.queue.reduce((res, content, i, data) => {
                        let prev = data[i - 1];
                        if (prev && !prev.historical && content.historical) {
                            res.push('Next up')
                        }
                        res.push(content);
                        return res;
                    }, [] as (QueueContentLocal | string)[]).map(c => {
                        if (typeof c === 'string') {
                            return <FlexLayout key="separetor" style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5, fontSize: 20, height: 100 }}>
                                <div>{c}</div>
                            </FlexLayout>
                        } else {
                            return <QueueItem onTumbItemClick={(e: React.MouseEvent<HTMLImageElement>) => this.setPreview(c.id)} innerRef={c.playing ? this.playingRef : undefined} key={c.queueId} content={c} session={this.props.session} />
                        }
                    })}
                    {this.props.queue.length === 0 &&
                        <FlexLayout key={'placeholder'} style={{ opacity: 0.5, fontSize: 20, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                            <div>To start add some videos</div>
                        </FlexLayout>}
                </FlipMove>
            </FlexLayout>
        )

        let searchRes = (
            <FlexLayout divider={0} style={{ flexGrow: 1, position: 'relative', flexDirection: 'column', paddingTop: 80 }}>
                {this.state.q && this.state.results.map(r => (
                    <FlexLayout onClick={() => this.onSelect(r)}>
                        <ContentItem onTumbItemClick={(e: React.MouseEvent<HTMLImageElement>) => this.setPreview(r.id)} content={{ id: r.id, title: r.title, thumb: r.thumb }} subtitle={r.subtitle} subtitleColor="dddddd" />
                    </FlexLayout>
                ))}
                {this.state.searching && (
                    <FlexLayout key={'placeholder'} style={{ opacity: 0.5, fontSize: 20, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                        <div>Searching...</div>
                    </FlexLayout>)}
            </FlexLayout>

        )

        return (
            <>
                {input}
                {this.state.q ? searchRes : queue}
                {ReactDOM.createPortal((
                    <PreviewModal id={this.state.preview} close={() => this.setPreview(undefined)} show={!!this.state.preview} />
                ), document.body)}
            </>
        );
    }
}

let geners = ['Rock', 'Alternative', 'Classical', 'Jazz', 'Blues', 'Hip-Hop', 'Dance', 'Folk', 'Soul', 'Country', 'Pop', 'Grunge', 'Reggae', 'New Wave', 'Hardcore', 'Opera', 'House', 'Techno', 'Disco', 'Ambient',]
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

interface QueueItemProps {
    content: QueueContentLocal,
    session: QueueSession,
    innerRef?: any,
    style?: ContentItemSrtyle,
    maxWidth?: string,
    onTumbItemClick?: (e: React.MouseEvent<HTMLImageElement>) => void
}
export class QueueItem extends React.PureComponent<QueueItemProps>{
    onVoteUp = () => {
        this.props.session.vote(this.props.content.queueId, true);
    }
    onVoteDown = () => {
        this.props.session.vote(this.props.content.queueId, false);
    }
    onSkip = () => {
        this.props.session.skip(this.props.content.queueId);
    }
    onRemove = () => {
        this.props.session.remove(this.props.content.queueId);
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
        let mine = this.props.content.user.id === this.props.session.clientId;

        let up = <Button onClick={this.onVoteUp} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><span style={{ color: meUp ? 'green' : this.props.content.playing ? '#000' : 'black', fontWeight: 300, transition: 'color 0.2s', marginTop: 1 }}>{ups ? ups : ''}</span>🤘</Button>;
        let down = <Button onClick={this.onVoteDown} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><span style={{ color: meDown ? 'red' : this.props.content.playing ? '#000' : 'black', fontWeight: 300, transition: 'color 0.2s', marginTop: 1 }}>{downs ? downs : ''}</span>👎</Button>;
        let del = <Button onClick={this.onRemove} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}>🗑</Button>;
        let skip = <Button onClick={this.onSkip} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><Skip /></Button>;
        return (
            <FlexLayout innerRef={this.props.innerRef} id={this.props.content.queueId} style={{ position: 'relative', flexDirection: 'row', opacity: this.props.content.historical && !this.props.content.playing ? 0.6 : undefined }}>
                <ContentItem onTumbItemClick={this.props.onTumbItemClick} style={this.props.style} maxWidth={this.props.maxWidth} content={this.props.content} playing={this.props.content.playing} progress={this.props.content.progress} subtitle={name} subtitleColor={color.color} />
                {!this.props.session.isHost && <FlexLayout style={{ flexDirection: 'column', zIndex: 100, position: 'absolute', top: 4, right: 7 }} divider={4}>
                    {
                        mine ?
                            <>
                                {mine && del}
                                <FlexLayout style={{ flexDirection: 'row' }} divider={0}>
                                    {!this.props.content.historical && up}
                                    {!this.props.content.canSkip && down}
                                </FlexLayout>

                            </> :
                            <>
                                {!this.props.content.historical && up}
                                {!this.props.content.canSkip && down}
                            </>
                    }
                    {this.props.content.canSkip && (!mine || this.props.content.historical) && skip}
                </FlexLayout>}
            </FlexLayout>
        );
    }
}

export class Searcher extends React.PureComponent<{ session: QueueSession, onClear: () => void }, { q: string, results: Content[] }>{

}

interface ContentItemSrtyle {
    progress1?: string,
    progress2?: string,
    textColor?: string,
}

interface ContentItemProps {
    content: Partial<QueueContentLocal>;
    subtitle?: string;
    subtitleColor?: string;
    progress?: number;
    playing?: boolean;
    subtitleCallback?: () => void;
    style?: ContentItemSrtyle,
    maxWidth?: string,
    onTumbItemClick?: (e: React.MouseEvent<HTMLImageElement>) => void
}
export class ContentItem extends React.PureComponent<ContentItemProps>{

    onTumbItemClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (this.props.onTumbItemClick) {
            e.stopPropagation();
            e.preventDefault();
            this.props.onTumbItemClick(e);
        }
    }

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
        return (
            <FlexLayout style={{ flexDirection: 'row', marginLeft: 17, marginRight: 20, paddingTop: 10, paddingBottom: 10, maxWidth: this.props.maxWidth || `calc(100% - 160px)`, zIndex: 0, color: this.props.style ? this.props.style.textColor : undefined }}>
                {this.props.content.playing && <div style={{
                    transition: 'width 0.2s',
                    background: `repeating-linear-gradient(
                                    45deg,
                                    ${this.props.style ? this.props.style.progress1 : '#f1f1f1'},
                                    ${this.props.style ? this.props.style.progress1 : '#f1f1f1'} 10px,
                                    ${this.props.style ? this.props.style.progress2 : '#fff'} 10px,
                                    ${this.props.style ? this.props.style.progress2 : '#fff'} 20px
                                )`,
                    position: 'absolute',
                    width: 100 * (this.props.progress || 0) + '%',
                    height: '100%',
                    zIndex: 0,
                    marginTop: -10,
                    marginLeft: -17,
                    marginRight: -20
                }} />}
                <FlexLayout style={{ zIndex: 1 }}>
                    {this.props.content.thumb && <img onClick={this.onTumbItemClick} src={this.props.content.thumb.url} width={width} height={height} style={{ margin: this.props.playing ? 0 : undefined, justifyContent: 'center', alignItems: 'center', transition: 'width 0.2s' }} />}
                </FlexLayout>
                <FlexLayout style={{ flexGrow: 1, zIndex: 1, maxWidth: '100%', flexDirection: 'column' }} divider={0}>
                    <FlexLayout>
                        <span style={{ fontWeight: 300, WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineClamp: 3 }}>{htmlDecode(this.props.content.title)}</span>
                    </FlexLayout>
                    <FlexLayout style={{ justifyContent: 'flex-end' }}>
                        {this.props.subtitle && <span onClick={this.props.subtitleCallback} style={{ fontWeight: 300, color: this.props.subtitleColor, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineClamp: 1 }}>{htmlDecode(this.props.subtitle)}</span>}
                    </FlexLayout>
                </FlexLayout>
            </FlexLayout>
        );
    }
}
