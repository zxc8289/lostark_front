This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 문의 게시판 관리자 등록

관리자 권한은 Discord 로그인 세션의 사용자 ID와 MongoDB `lostark.users`의 `role` 필드로 확인합니다. 관리자 키 입력이나 `SUPPORT_ADMIN_SECRET` 환경변수는 사용하지 않습니다.

1. 관리자 계정으로 사이트에 Discord 로그인해 `users` 문서가 생성되도록 합니다.
2. MongoDB에서 해당 계정의 Discord 숫자 ID를 확인하고 권한을 부여합니다.

```javascript
use lostark
db.users.updateOne({ id: "본인_DISCORD_ID" }, { $set: { role: "admin" } })
```

`matchedCount`가 1인지 확인하세요. 관리자 권한을 해제하려면 같은 문서에서 `role` 필드를 제거합니다.

```javascript
db.users.updateOne({ id: "본인_DISCORD_ID" }, { $unset: { role: "" } })
```

등록 후 사이트의 문의 게시판을 새로고침하면 관리자 화면이 표시됩니다. 공지 작성·수정·삭제와 공식 답변 권한은 각 API 요청에서 다시 확인합니다.

댓글과 답글은 작성자가 수정·삭제할 수 있고 관리자는 모두 관리할 수 있습니다. 로그인한 작성자는 Discord ID로 확인합니다. 비로그인 작성자에게는 댓글별 편집 키가 발급되어 해당 브라우저에 저장됩니다. 편집 키가 없는 기존 비로그인 댓글은 작성자를 확인할 방법이 없어 관리자만 관리할 수 있습니다. 답글이 달린 댓글을 삭제하면 원문은 지우고 "삭제된 댓글입니다." 표시를 남겨 답글 흐름을 유지합니다.

일반 사용자의 공지 댓글, 새 문의글, 문의 댓글은 각 관리자에게 사이트 상단 알림으로 전달됩니다. 알림은 MongoDB `admin_alerts` 컬렉션에 관리자별로 저장되며, 컬렉션은 첫 알림이 생성될 때 자동으로 만들어집니다. 알림은 약 1분 간격으로 갱신되고 관리자가 알림을 열면 해당 관리자에게만 읽음 처리됩니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
