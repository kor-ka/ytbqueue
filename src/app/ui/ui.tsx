import * as React from "react";
import Glamorous from "glamorous";
export const isChromium = (window as any).chrome;

export const FlexLayout = Glamorous.div<{
    divider?: number;
    style?: React.CSSProperties;
}>(props => ({
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    WebkitOverflowScrolling: "touch",
    boxSizing: "border-box",
    "> *": props.style && props.style.flexDirection === 'row' ? {
        marginLeft: props.divider !== undefined ? props.divider : 5,
        marginRight: props.divider !== undefined ? props.divider : 5
    } : {
            marginTop: props.divider !== undefined ? props.divider : 5,
            marginBottom: props.divider !== undefined ? props.divider : 5
        },
    ">:first-child": props.style && props.style.flexDirection === 'row' ? {
        marginLeft: 0
    } : {
            marginTop: 0
        },
    ">:last-child": props.style && props.style.flexDirection === 'row' ? {
        marginRight: 0
    } : {
            marginBottom: 0
        },
    ...props.style
}));

export const Landscape = Glamorous.div({
    '@media only screen and (orientation: portrait)': {
        display: 'none',
    }
});

export const Portrait = Glamorous.div({
    '@media only screen and (orientation: landscape)': {
        display: 'none',
    }
});

const ButtonInner = Glamorous.div<{ type?: 'danger' }>((props) => ({
    minWidth: 28,
    color: 'black',
    whiteSpace: 'pre-wrap',
    fontSize: '16px',
    backgroundColor: props.type === 'danger' ? 'rgba(250, 200, 200, 0.6)' : 'rgba(250, 250, 250, 0.6)',
    padding: 10,
    paddingTop: 11,
    paddingBottom: 9,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'center',
    userSelect: 'none',

    ':focus': {
        outline: 0
    },

}));

export const Button = (props?: { className?: string, style?: React.CSSProperties, onClick?: () => void, type?: 'danger', children?: any }) => <ButtonInner type={props.type} className={props.className} style={props.style} onClick={props.onClick}><span style={{ marginRight: isChromium ? 0 : 5 }}>{props.children}</span></ButtonInner>

export const TextContentStyled = Glamorous.div<{ selected?: boolean }>(
    props => ({
        whiteSpace: "pre-wrap",
        border: props.selected ? "1px solid #3E5C6B" : undefined,
        color: "rgba(0, 0, 0, 0.8)",
        fontSize: "16px",
        backgroundColor: "rgba(250, 250, 250, 0.4)",
        padding: 10,
        borderRadius: 10,
        userSelect: 'none',
        cursor: "pointer"
    })
);

export const ActionTextContentStyled = Glamorous.div<{ selected?: boolean }>(
    props => ({
        whiteSpace: "pre-wrap",
        color: "rgba(0, 0, 0, 0.8)",
        fontSize: "16px",
        backgroundColor: "rgba(250, 250, 250, 0.4)",
        padding: 10,
        userSelect: 'none',
        borderRadius: 10
    })
);

const TextAreaInner = Glamorous.textarea({
    whiteSpace: "pre-wrap",
    padding: 10,
    color: "rgba(0, 0, 0, 0.8)",
    fontSize: "16px",
    backgroundColor: "rgba(250, 250, 250, 0.4)",
    borderRadius: 10,
    border: '0px',
    resize: "none",
    ':focus': {
        outline: 0
    },
});

export class InputAutosize extends React.PureComponent<{
    value: string;
    onChange: (event: React.FormEvent<HTMLTextAreaElement>) => void;
    maxHeight?: number,
    style?: React.CSSProperties;
}> {
    ref = React.createRef<HTMLTextAreaElement>();
    height = 0;

    resize = () => {
        this.height = this.ref.current.scrollHeight + 25;
        if (this.height >= (this.props.maxHeight || 250)) {
            return;
        }

        this.ref.current.style.cssText = "height:auto; padding:0";
        this.ref.current.style.cssText =
            "height:" + (this.ref.current.scrollHeight + 25) + "px";

    };

    componentDidMount() {
        if (this.ref.current) {
            this.ref.current.addEventListener("keydown", this.resize);
        }
        this.resize();
    }

    render() {
        return (
            <TextAreaInner
                innerRef={this.ref}
                style={{
                    ...this.props.style
                }}
                value={this.props.value}
                onChange={this.props.onChange}
            />
        );
    }
}

export const Input = Glamorous.input({
    minHeight: 24,
    outline: 0,
    borderWidth: '0 0 0px',
    backgroundColor: 'transparent',
    fontSize: 16,
    minWidth: 50,
    lineHeight: 1.5,
});

