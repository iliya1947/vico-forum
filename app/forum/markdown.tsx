import ReactMarkdown from "react-markdown";

export function ForumMarkdown({ children }: { children: string }) {
  return (
    <div className="post-body">
      <ReactMarkdown
        components={{
          img: () => null,
          a: ({ children: linkChildren, href, title }) => (
            <a href={href} title={title} rel="nofollow noopener noreferrer ugc" target="_blank">{linkChildren}</a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
