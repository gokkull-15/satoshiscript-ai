;; Super Simple NFT - No argument count errors
(define-non-fungible-token simple-nft uint)

(define-data-var token-id-nonce uint u0)
(define-map token-owner uint principal)

(define-public (mint (recipient principal))
  (let ((token-id (+ (var-get token-id-nonce) u1)))
    (map-set token-owner token-id recipient)
    (var-set token-id-nonce token-id)
    (ok token-id)))

(define-read-only (get-owner (token-id uint))
  (map-get? token-owner token-id))

(define-read-only (get-last-token-id)
  (ok (var-get token-id-nonce)))