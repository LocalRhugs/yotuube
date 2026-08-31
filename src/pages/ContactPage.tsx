import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <Helmet>
        <title>Contact — Creator Cloud</title>
        <meta name="description" content="Story tips, corrections, partnership inquiries, and DMCA notices for Creator Cloud." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/contact" />
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4 text-white">Contact</h1>
        <p className="text-gray-400 mb-10">
          For story tips, corrections, partnership inquiries, or DMCA notices, use the form below.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-white/5 bg-white/[0.02]">
            <Mail className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-semibold">Editorial</p>
              <p className="text-xs text-gray-400">Story tips, corrections, and source notes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-white/5 bg-white/[0.02]">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-sm font-semibold">Legal & DMCA</p>
              <p className="text-xs text-gray-400">Copyright and policy reports</p>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="p-8 rounded-lg border border-green-500/30 bg-green-500/5 text-center">
            <p className="text-green-300 font-semibold">Thanks — we'll be in touch.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="space-y-4 max-w-xl"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="text-sm text-gray-300 block mb-1">Your name</label>
                <Input id="contact-name" required placeholder="Your name" name="name" />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm text-gray-300 block mb-1">Email</label>
                <Input id="contact-email" required type="email" placeholder="Email" name="email" />
              </div>
            </div>
            <div>
              <label htmlFor="contact-subject" className="text-sm text-gray-300 block mb-1">Subject</label>
              <Input id="contact-subject" required placeholder="Subject" name="subject" />
            </div>
            <div>
              <label htmlFor="contact-message" className="text-sm text-gray-300 block mb-1">Your message</label>
              <Textarea id="contact-message" required placeholder="Your message" name="message" rows={6} />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Send message</Button>
          </form>
        )}
      </article>
    </>
  );
}
